import React from "react";
import withAuth from "../utils/withAuth";
import { useNavigate } from "react-router-dom";
import { useState, useEffect,  useContext } from "react";
import "../App.css";
import { IconButton } from "@mui/material";
import RestoreIcon from "@mui/icons-material/Restore";
import {Button} from "@mui/material";
import TextField from '@mui/material/TextField';
import { AuthContext } from '../contexts/AuthContext';


function HomeComponent(){

    let navigate = useNavigate();
    const[meetingCode, setMeetingCode] = useState("");


    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/auth");
        }
      }, [navigate]);

    const {addToUserHistory} = useContext(AuthContext);
    let handleJoinVideoCall = async() => {
        await addToUserHistory(meetingCode)
        navigate(`/${meetingCode}`)
    }

    return(
        <><div className="navbar">
            <div style={{display: "flex", alignItems: "center"}}>
                <h2>QuickMeet</h2>
            </div>
            <div style={{display: "flex", alignItems: "center"}}>
                <IconButton onClick={
                    () => {
                        navigate("/history")
                    }
                }>
                    <RestoreIcon/>
                </IconButton>
                <p>History</p>
                <Button
                onClick={() => {
                    localStorage.removeItem("token")
                    navigate("/auth")
                }}>
                    Logout
                </Button>
            </div>
       </div>

            <div className="meetContainer">
            <div className="leftPanel">
                <div>
                    <h2>Providing Quality Video Call Just Like Quality Education</h2>

                    <div style={{ display: 'flex', gap: "10px" }}>

                        <TextField onChange={e => setMeetingCode(e.target.value)} id="outlined-basic" label="Meeting Code" variant="outlined" />
                        <Button onClick={handleJoinVideoCall} variant='contained'>Join</Button>

                    </div>
                </div>
            </div>
            <div className='rightPanel'>
                <img srcSet='/logo3.png' alt="" />
            </div>
            </div>

       </>
    )
}

export default withAuth(HomeComponent);

