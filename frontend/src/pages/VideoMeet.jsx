import React, { useRef, useEffect, useState } from 'react';
import {useNavigate} from "react-router-dom";
import { TextField, Button, Box, Typography, IconButton, Badge } from '@mui/material';
import io from 'socket.io-client';
import styles from "../styles/VideoComponent.module.css";
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import server from "../environment"


// Backend server URL for Socket.IO connections
const server_url = server;

// Global object to store all WebRTC peer connections
// Key: socketId, Value: RTCPeerConnection object
var connections = {};

// WebRTC configuration for establishing peer-to-peer connections
// STUN server helps with NAT traversal (connecting users behind firewalls)
const peerConfigConnections = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302", // Google's free STUN server
    },
  ],
};

function VideoMeetComponent() {
  // ===== REFS (References to DOM elements and objects) =====
  var socketRef = useRef(null);        // Reference to Socket.IO connection
  let socketIdRef = useRef(null);      // Reference to current user's socket ID
  let localVideoRef = useRef(null);    // Reference to local video element

  // ===== STATE VARIABLES =====
  // Media availability states
  let [videoAvailable, setVideoAvailable] = useState(true);    // Can access camera?
  let [audioAvailable, setAudioAvailable] = useState(true);    // Can access microphone?
  let [screenAvailable, setScreenAvailable] = useState(null);  // Can share screen?

  // Media stream states
  let [video, setVideo] = useState(true);      // Video stream state (on/off)
  let [audio, setAudio] = useState(true);    // Audio stream state (on/off)
  let [screen, setScreen] = useState(null);  // Screen sharing state

  // UI states
  let [showModal, setShowModal] = useState(true);     // Modal visibility
  let [askForUsername, setAskForUsername] = useState(true);  // Show username form?
  let [username, setUsername] = useState("");         // User's entered name

  // Chat states
  let [messages, setMessages] = useState([]);         // Array of chat messages
  let [message, setMessage] = useState("");           // Current message being typed
  let [newMessages, setNewMessages] = useState(0);      // New message counter

  // Video management
  const videoRef = useRef([]);                        // Reference to all video elements
  let [videos, setVideos] = useState([]);             // Array of all participant videos

  // ===== PERMISSION HANDLING =====
  /**
   * Requests camera and microphone permissions from the user
   * Sets up the local media stream if permissions are granted
   * Returns a promise that resolves when the stream is set
   */
  const getPermissions = async () => {
    try {
      // Request camera permission
      const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoPermission) {
        setVideoAvailable(true);
      } else {
        setVideoAvailable(false);
      }

      // Request microphone permission
      const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (audioPermission) {
        setAudioAvailable(true);
      } else {
        setAudioAvailable(false);
      }

      // Check if screen sharing is supported
      if (navigator.mediaDevices.getDisplayMedia) {
        setScreenAvailable(true);
      } else {
        setScreenAvailable(false);
      }

      // If either video or audio is available, get the combined stream
      if (videoAvailable || audioAvailable) {
        const userMediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoAvailable,
          audio: audioAvailable,
        });

        if (userMediaStream) {
          // Store stream globally for use in WebRTC connections
          window.localStream = userMediaStream;
          // Display local video in the video element
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = userMediaStream;
            localVideoRef.current.onloadedmetadata = () => {
              localVideoRef.current.play();
            };
            console.log("Set local video stream", userMediaStream, localVideoRef.current);
          }
          return Promise.resolve();
        }
      }
      return Promise.resolve();
    } catch (err) {
      console.log("Permission denied or error:", err);
      return Promise.reject(err);
    }
  };

  // ===== EFFECTS =====
  // Run getPermissions when component first loads
  useEffect(() => {
    getPermissions();
  }, []);

  // ===== MEDIA STREAM HANDLING =====
  /**
   * Callback function when getUserMedia succeeds
   * @param {MediaStream} stream - The media stream object
   */
  let getUserMediaSuccess = (stream) => {
    // 1. Stop any previous tracks
    try{
      window.localStream.getTracks().forEach((track) => {track.stop()})
    }catch(e){
      console.log(e);
    }
  
    // 2. Save the new stream globally and show it in the local video element
    window.localStream = stream;
    localVideoRef.current.srcObject = stream;
  
    // 3. For each peer connection (except myself), add the new stream and create/send an offer
    for(let id in connections){
      if(id === socketIdRef.current){
        continue;
      }
      connections[id].addStream(window.localStream);
      connections[id].createOffer().then((description) => {
        connections[id].setLocalDescription(description).then(() => {
          socketRef.current.emit("signal", id, JSON.stringify({sdp: connections[id].localDescription}))
        }).catch(e => console.log(e))
      }).catch(e => console.log(e))
    }
  
    // 4. Handle when any track in the stream ends (e.g., user turns off camera/mic)
    stream.getTracks().forEach((track) => track.onended = () => {
      setVideo(false);
      setAudio(false);
  
      try{
        let tracks = localVideoRef.current?.srcObject?.getTracks();
        tracks?.forEach((track) => track.stop());
      }catch(e){
        console.log(e);
      }
  
      // TODO: Blacksilence (show black screen or silence when stream ends)
      let blackSilence = (...args) => new MediaStream([black(...args), silence(...args)]);
        window.localStream = blackSilence();
        localVideoRef.current.srcObject = window.localStream;
  
      // 5. Re-offer to all peers with the new (now stopped) stream
      for(let id in connections){
        connections[id].addStream(window.localStream);
        connections[id].createOffer().then((description) => {
          connections[id].setLocalDescription(description).then(() => {
            socketRef.current.emit("signal", id, JSON.stringify({sdp: connections[id].localDescription}))
          }).catch(e => console.log(e))
        }).catch(e => console.log(e))
      }
    })
  };

  // Function to generate a silent audio track
  const silence = () => {
    const ctx = new AudioContext(); // Create an audio context
    const oscillator = ctx.createOscillator(); // Create a basic tone generator (oscillator)
    const dst = oscillator.connect(ctx.createMediaStreamDestination()); // Connect oscillator to a stream destination
    oscillator.start(); // Start generating sound
    ctx.resume(); // Resume context if it's suspended
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false }); 
    // Disable the audio track to simulate silence
  };



  // Function to generate a black video track
  const black = ({ width = 640, height = 480 } = {}) => {
    const canvas = Object.assign(document.createElement("canvas"), { width, height });
    const ctx = canvas.getContext("2d");
    ctx.fillRect(0, 0, width, height); // Fill the canvas with black

    const stream = canvas.captureStream(); // Capture the black canvas as a video stream
    return Object.assign(stream.getVideoTracks()[0], { enabled: false }); 
    // Disable the video track to simulate a "black" video (no active camera)
  };


  /**
   * Manages media streams (start/stop video/audio)
   * Called when user toggles video or audio
   */
  let getUserMedia = () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      // Start media stream
      navigator.mediaDevices
        .getUserMedia({ video: video, audio: audio })
        .then(getUserMediaSuccess)
        .catch((e) => console.log("Error getting media:", e));
    } else {
      // Stop all media tracks
      try {
        let tracks = localVideoRef.current?.srcObject?.getTracks();
        tracks?.forEach((track) => track.stop());
      } catch (e) {
        console.log("Error stopping tracks:", e);
      }
    }
  };

  // Automatically get media when video/audio states change
  useEffect(() => {
    if (video === undefined && audio === undefined) {
      getUserMedia();
    }
  }, [video, audio]);

  // ===== SOCKET.IO MESSAGE HANDLERS =====
  /**
   * Handles WebRTC signaling messages from other users
   * @param {string} fromId - Socket ID of the sender
   * @param {string} message - The signaling message (SDP offer/answer or ICE candidate)
   */
  let gotMessageFromServer = (fromId, message) => {
    // Parse the incoming signaling message (SDP or ICE)
    var signal = JSON.parse(message);

    // Only handle if the message is not from ourselves
    if (fromId !== socketIdRef.current) {
      if (signal.sdp) {
        // Set the remote description (offer or answer)
        connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
          // If the signal is an offer, create and send an answer
          if (signal.sdp.type === "offer") {
            connections[fromId].createAnswer().then((description) => {
              connections[fromId].setLocalDescription(description).then(() => {
                socketRef.current.emit("signal", fromId, JSON.stringify({ sdp: connections[fromId].localDescription }));
              }).catch(e => console.log(e))
            }).catch(e => console.log(e))
          }
        }).catch(e => console.log(e))
      }
      if(signal.ice){
        connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
      }
    }

  };

  /**
   * Handles chat messages from other users
   */
  // TODO: handle chat message
  // This would add the message to the chat display

  let addMessage = (data, sender, socketIdSender) => {
    setMessages((prevMessages) => [
      ...prevMessages,{sender:sender, data:data} 
    ]);

    if(socketIdSender !== socketIdRef.current){
      setNewMessages((prevMessages) => prevMessages + 1)
    }
    
  };

  // ===== SOCKET.IO CONNECTION SETUP =====
  /**
   * Establishes Socket.IO connection and sets up event listeners
   * This is the core function that enables real-time communication
   */
  let connectToSocketServer = () => {
    socketRef.current = io.connect(server_url);

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;
      console.log("Connected to socket server", server_url, "My socket ID:", socketIdRef.current);

      // Immediately emit join-call after connecting
      socketRef.current.emit("join-call", window.location.href);

      // Listen for WebRTC signaling messages
      socketRef.current.on("signal", gotMessageFromServer);

      // Listen for user-joined, chat-message, etc. as before
      socketRef.current.on("user-joined", (id, clients) => {
        console.log("User joined event:", id, clients);
        // For each user in the meeting, create a WebRTC connection if not already present
        clients.forEach((socketListId) => {
          if (socketListId === socketIdRef.current) return; // Don't connect to self
          if (!connections[socketListId]) {
            // Create a new RTCPeerConnection for this user
            const pc = new RTCPeerConnection(peerConfigConnections);
            connections[socketListId] = pc;
            console.log('Created RTCPeerConnection for', socketListId);

            // Add local tracks
            if (window.localStream) {
              window.localStream.getTracks().forEach(track => {
                pc.addTrack(track, window.localStream);
                console.log('Added track to connection:', track);
              });
            }

            // Handle ICE candidates
            pc.onicecandidate = (event) => {
              if (event.candidate) {
                socketRef.current.emit("signal", socketListId, JSON.stringify({ ice: event.candidate }));
                console.log('Sent ICE candidate to', socketListId);
              }
            };

            // Handle remote tracks
            pc.ontrack = (event) => {
              console.log('Received remote track from', socketListId, event.streams[0]);
              setVideos(prev => {
                // Avoid duplicates
                if (prev.some(v => v.socketId === socketListId)) return prev;
                const updated = [...prev, { socketId: socketListId, stream: event.streams[0] }];
                console.log('Updated videos array:', updated);
                return updated;
              });
            };
          }
        });

        // Only the new user (the one who just joined) creates offers to all existing users
        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            if (id2 === socketIdRef.current) continue;
            const pc = connections[id2];
            pc.createOffer().then((description) => {
              pc.setLocalDescription(description).then(() => {
                socketRef.current.emit("signal", id2, JSON.stringify({ sdp: pc.localDescription }));
                console.log('Sent SDP offer to', id2);
              });
            });
          }
        }
      });
      socketRef.current.on("chat-message", addMessage);
      socketRef.current.on("user-left", (id) => {
        setVideos((videos) => videos.filter((video) => video.socketId !== id));
        if (connections[id]) {
          connections[id].close();
          delete connections[id];
        }
      });
    });
  };

  // ===== MEDIA SETUP =====
  /**
   * Sets up media streams and connects to Socket.IO server
   * Called when user clicks "Connect"
   */
  let getMedia = async () => {
    await getPermissions(); // Ensure local stream is set
    connectToSocketServer(); // Now connect and join room
  };


  let routeTo = useNavigate();
  // ===== UI EVENT HANDLERS =====
  /**
   * Handles the "Connect" button click
   * Switches from lobby to meeting view
   */
  
  let connect = async () => {
    setAskForUsername(false); // Hide username form
    await getMedia(); // Start media and connect to server
  };

  let handleVideo = () => {
    setVideo((prev) => {
      if (window.localStream) {
        window.localStream.getVideoTracks().forEach(track => {
          track.enabled = !prev;
        });
      }
      return !prev;
    });
  };

  let handleAudio = () => {
    setAudio((prev) => {
      if (window.localStream) {
        window.localStream.getAudioTracks().forEach(track => {
          track.enabled = !prev;
        });
      }
      return !prev;
    });
  };

  let getDisplayMediaSuccess = (stream) => {
    // Stop the current video tracks (camera)
    if (window.localStream) {
      window.localStream.getVideoTracks().forEach(track => track.stop());
    }

    // Set the new stream as the local stream
    window.localStream = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    // Replace the video track in all peer connections
    Object.keys(connections).forEach(id => {
      if (id === socketIdRef.current) return;
      const pc = connections[id];
      // Find the sender for the video track
      const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (videoSender) {
        // Replace the camera track with the screen track
        videoSender.replaceTrack(stream.getVideoTracks()[0]);
      }
    });

    // When screen sharing ends, revert to camera
    stream.getTracks().forEach((track) => {
      track.onended = () => {
        setScreen(false);
        // Restore camera
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(camStream => {
          window.localStream = camStream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = camStream;
            localVideoRef.current.onloadedmetadata = () => {
              localVideoRef.current.play();
            };
          }
          // Replace the screen track with the camera track in all peer connections
          Object.keys(connections).forEach(id => {
            if (id === socketIdRef.current) return;
            const pc = connections[id];
            const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(camStream.getVideoTracks()[0]);
            }
          });
        });
      };
    });
  };

  let getDisplayMedia = () => {
    if (!screen) {
      if (navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
          .then(getDisplayMediaSuccess)
          .catch((e) => console.log(e));
      }
    } else {
      // If screen is already being shared, stop it (handled by onended above)
      setScreen(false);
    }
  };

  useEffect(() => {
    if (screen === undefined) {
      getDisplayMedia();
    }
  }, [screen]);

  let handleScreen = () => {
    if (screen) {
      // If screen sharing is on, stop the screen video track
      if (window.localStream) {
        const screenTrack = window.localStream.getVideoTracks()[0];
        if (screenTrack) {
          screenTrack.stop(); // This will trigger the onended handler, which will setScreen(false)
        }
      }
      // Do NOT call setScreen(false) here!
    } else {
      setScreen(true);
      getDisplayMedia();
    }
  };

  let sendMessage = () => {
    socketRef.current.emit("chat-message",message,username);
    setMessage("");
  }

  let handleEndCall = () => {
    try{
      let tracks = localVideoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop())
    }catch(e){
      console.log(e);
    }
    routeTo("/home");

  }

  // ===== RENDER =====
  useEffect(() => {
    if (localVideoRef.current && window.localStream) {
      localVideoRef.current.srcObject = window.localStream;
      localVideoRef.current.onloadedmetadata = () => {
        localVideoRef.current.play();
      };
    }
  }, [askForUsername]);

  return (
    <div>
      {askForUsername === true ? (
        // Lobby/Username Entry Screen
        <div>
          <h2>Enter into Lobby</h2>
          <TextField
            id="outlined-basic"
            label="Username"
            variant="outlined"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Button variant="contained" onClick={connect}>Connect</Button>
          
          {/* Local video preview */}
          <div>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              width={320}
              height={240}
              style={{ display: "block", background: "#000" }}
            />
            
          </div>
        </div>
      ) : (
        // Meeting Room Screen (currently empty - TODO: implement)
        <div className={styles.meetVideoContainer}>

          {showModal ? <div className={styles.chatRoom}>
            <div className={styles.chatContainer}>
              <h1>Chat</h1>

              <div className={styles.chattingDisplay}>
                {messages.length > 0 ? messages.map((item,index) => {
                  return(
                    <div style={{marginBottom: "20px"}} key={index}>
                        <p style ={{fontWeight: "bold"}}>{item.sender}</p>
                        <p>{item.data}</p>
                    </div>
                  )
                }): <p>No messages yet</p>}


              </div>
              <div className={styles.chattingArea}>
                <TextField value={message} onChange={(e) => setMessage(e.target.value)} id="outlined-basic" label="Enter your chat" variant="outlined" />
                <Button variant='contained'  onClick={sendMessage}>Send</Button>
              </div>
            </div>
            </div>: <></>}

          <div className={styles.buttonContainers}>
            <IconButton onClick={handleVideo} style={{color: "white"}}>
              {video===true? <VideocamIcon/> :  <VideocamOffIcon/>}
            </IconButton>
            <IconButton onClick={handleEndCall} style={{color: "red"}}>
              <CallEndIcon/>
            </IconButton>
            <IconButton onClick={handleAudio} style={{color: "white"}}>
              {audio===true? <MicIcon/> : <MicOffIcon/>}
            </IconButton>
            {screenAvailable === true ? 
            <IconButton onClick={handleScreen} style={{color: "white"}}>
              {screen === true ? <ScreenShareIcon/> : <StopScreenShareIcon/>}
            </IconButton> : <></>}
            
            <Badge badgeContent={newMessages} max={999} color='secondary'>
              <IconButton onClick={() => setShowModal((prev) => !prev)} style={{color: "white"}}>
                <ChatIcon/>
              </IconButton>
            </Badge>
         </div>

            {/* Local video stream */}
            <video className={styles.meetUserVideo} ref={localVideoRef} autoPlay muted playsInline />
            <div className={styles.conferenceView}>
              {/* Remote participant videos */}
              {videos.map((video) => {
                // console.log("Rendering video for", video.socketId, "Stream:", video.stream);
                return (
                  <div className={styles.participant} key={video.socketId}>
                    {/* <h2>{video.socketId}</h2> */}
                    <video
                      data-socket={video.socketId}
                      ref={ref => {
                        if (ref && video.stream) {
                          ref.srcObject = video.stream;
                          // console.log(`Attached stream for ${video.socketId}`);
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                    />
                  </div>
                );
              })}
            </div>
        </div>

      )}
    </div>
  );
}

export default VideoMeetComponent;