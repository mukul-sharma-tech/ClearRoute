import React from 'react';
import "../App.css"
 import { Link } from "react-router-dom";


export default function LandingPage() {
  return ( 
        <div className='landingPageContainer'> 
        <nav>
            <div className='navHeader'>
                  <h2>ClearRoute</h2>
            </div>
            <div className='navList'>
                  <Link to={"/auth"} style={{ textDecoration: 'none', color: '#0F172A' }}>Login</Link>
                  <Link to={"/auth"} style={{ textDecoration: 'none', color: '#0F172A' }}>Register</Link>
            </div>
        </nav>

        <div className="landingPageMainContainer">
        <div>
            <h1><span style={{color : "#0F52BA"}}>Enterprise-Grade</span> Support Resolution</h1>

            <p>Reliable, real-time video support architecture. Seamless integration, instant connectivity.</p>
            <div role='button'>
                  <Link to={"/auth"}>Start a Session</Link>
            </div>
        </div>

        <div>
            <img src="https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=1000&ixlib=rb-4.0.3" alt="Enterprise Support Dashboard" />
        </div>
        </div>
        </div>
       );
 }
 