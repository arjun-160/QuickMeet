import React from 'react';
import "../App.css";
import {Link} from "react-router-dom";
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {

  const router = useNavigate();
  return (
    <div className="landingPageContainer">
      
      {/* Navigation Bar */}
      <nav>
        <div className="navHeader">
          <h2>QuickMeet</h2>
        </div>

        <div className="navList">
          <p onClick={()=>{
            router("/sample_room");
          }}>Join as Guest</p>
          <p onClick={()=>{
            router("/auth");
          }}>Register</p>
          <div role="button">
            <p onClick={()=>{
            router("/auth");
          }}>Login</p>
          </div>
        </div>
      </nav>

      {/* Main Hero Section */}
      <div className="landingMainContainer">
        <div>
          <h1>
            <span style={{ color: "#FF9839" }}>Connect</span> with your loved Ones
          </h1>
          <p>Cover the distance with QuickMeet</p>
          <div role="button">
            <Link to={"/auth"}>Get Started</Link>
          </div>
        </div>

        <div>
          <img src="/mobile.png" alt="Mobile" />
        </div>
      </div>
      
    </div>
  );
}
