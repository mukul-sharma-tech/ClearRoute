import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
// import { connect } from "mongoose";

const server_url = `http://${window.location.hostname}:8000`;
// const socket = io("http://localhost:8000");

var connections = {};

const peerConfigConnections = {
    "iceServers": [
        // Using our own node-turn server to ensure media is routed through the server (no direct P2P)
        {
            "urls": "turn:localhost:3478",
            "username": "atomquest",
            "credential": "hackathon123"
        },
        // Fallback STUN
        { "urls": "stun:stun.l.google.com:19302" }
    ],
    "iceTransportPolicy": "all"
}

export default function VideoMeetComponent() {

    var socketRef = useRef();
    let socketIdRef = useRef();

    let localVideoref = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);

    let [audioAvailable, setAudioAvailable] = useState(true);

    let [video, setVideo] = useState([]);

    let [audio, setAudio] = useState();

    let [screen, setScreen] = useState();

    let [showModal, setModal] = useState(true);

    let [_screenAvailable, setScreenAvailable] = useState(); // eslint-disable-line no-unused-vars

    let [messages, setMessages] = useState([])

    let [message, setMessage] = useState("");

    let [newMessages, setNewMessages] = useState(3);

    let [askForUsername, setAskForUsername] = useState(true);

    let [username] = useState(localStorage.getItem("name") || "Guest");
    const role = localStorage.getItem("role") || "Customer";
    const [pinnedStreamId, setPinnedStreamId] = useState(null);
    const handlePin = (e, streamId) => { if (e) e.stopPropagation(); setPinnedStreamId(streamId); };
    const handleUnpin = (e) => { if (e) e.stopPropagation(); setPinnedStreamId(null); };

    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);

    const [lobbyVideo, setLobbyVideo] = useState(true);
    const [lobbyAudio, setLobbyAudio] = useState(true);

    const videoRef = useRef([])

    let [videos, setVideos] = useState([])

    // TODO
    // if(isChrome() === false) {


    // }

    useEffect(() => {
        getPermissions(); // eslint-disable-line react-hooks/exhaustive-deps
    }, []); // getPermissions is stable — only needs to run once on mount

    useEffect(() => {
        if (!askForUsername && localVideoref.current && window.localStream) {
            localVideoref.current.srcObject = window.localStream;
        }
    }, [askForUsername]);

    let getDislayMedia = () => {
        if (screen) {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                    .then(getDislayMediaSuccess)
                    .then((stream) => { })
                    .catch((e) => console.log(e))
            }
        }
    }

    const getPermissions = async () => {
        try {
            const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoPermission) {
                setVideoAvailable(true);
                console.log('Video permission granted');
            } else {
                setVideoAvailable(false);
                console.log('Video permission denied');
            }

            const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (audioPermission) {
                setAudioAvailable(true);
                console.log('Audio permission granted');
            } else {
                setAudioAvailable(false);
                console.log('Audio permission denied');
            }

            if (navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            } else {
                setScreenAvailable(false);
            }

            if (videoAvailable || audioAvailable) {
                const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable });
                if (userMediaStream) {
                    window.localStream = userMediaStream;
                    if (localVideoref.current) {
                        localVideoref.current.srcObject = userMediaStream;
                    }
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    let getMedia = () => {
        setVideo(lobbyVideo);
        setAudio(lobbyAudio);
        connectToSocketServer();
    }

    let getDislayMediaSuccess = (stream) => {
        window.screenStream = stream;

        let newVideo = {
            socketId: socketIdRef.current || 'local-screen',
            stream: stream,
            streamId: stream.id,
            autoplay: true,
            playsinline: true,
            isLocalScreen: true
        };

        setVideos(videos => {
            const updatedVideos = [...videos, newVideo];
            videoRef.current = updatedVideos;
            return updatedVideos;
        });

        for (let id in connections) {
            if (id === socketIdRef.current) continue;

            window.screenStream.getTracks().forEach(track => connections[id].addTrack(track, window.screenStream));

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description).then(() => {
                    socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
                }).catch(e => console.log(e));
            });
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false);

            try {
                window.screenStream.getTracks().forEach(track => track.stop());
            } catch (e) { console.log(e) }

            window.screenStream = null;

            setVideos(videos => {
                const updatedVideos = videos.filter(v => v.streamId !== stream.id);
                videoRef.current = updatedVideos;
                return updatedVideos;
            });

            for (let id in connections) {
                if (id === socketIdRef.current) continue;

                connections[id].getSenders().forEach(sender => {
                    if (sender.track && sender.track.readyState === 'ended') {
                        connections[id].removeTrack(sender);
                    }
                });

                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description).then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
                    });
                });
            }
        });
    }

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message)

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }




    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false })

        socketRef.current.on('signal', gotMessageFromServer)

        socketRef.current.on('connect', () => {
            const role = localStorage.getItem("role") || "Customer";
            socketRef.current.emit('join-call', window.location.href, role)
            socketIdRef.current = socketRef.current.id

            socketRef.current.on('call-error', (errMsg) => {
                alert(errMsg);
                window.location.href = "/home";
            })

            socketRef.current.on('chat-message', addMessage)

            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id))
            })

            socketRef.current.on('user-joined', (id, clients) => {
                clients.forEach((socketListId) => {

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections)
                    // Wait for their ice candidate       
                    connections[socketListId].onicecandidate = function (event) {
                        if (event.candidate != null) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
                        }
                    }

                    // Wait for their video stream
                    connections[socketListId].ontrack = (event) => {
                        let stream = event.streams[0];
                        if (!stream) return;

                        let videoExists = videoRef.current.find(video => video.streamId === stream.id);

                        if (videoExists) {
                            // Update the stream of the existing video
                            setVideos(videos => {
                                const updatedVideos = videos.map(video =>
                                    video.streamId === stream.id ? { ...video, stream: stream } : video
                                );
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        } else {
                            // Create a new video
                            let newVideo = {
                                socketId: socketListId,
                                stream: stream,
                                streamId: stream.id,
                                autoplay: true,
                                playsinline: true
                            };

                            setVideos(videos => {
                                const updatedVideos = [...videos, newVideo];
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });

                            // Handle stream removal when screen share stops
                            stream.onremovetrack = () => {
                                if (stream.getTracks().length === 0) {
                                    setVideos(videos => {
                                        const updatedVideos = videos.filter(v => v.streamId !== stream.id);
                                        videoRef.current = updatedVideos;
                                        return updatedVideos;
                                    });
                                }
                            };
                        }
                    };


                    // Add the local video stream
                    if (window.localStream !== undefined && window.localStream !== null) {
                        window.localStream.getTracks().forEach(track => connections[socketListId].addTrack(track, window.localStream));
                    } else {
                        let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
                        window.localStream = blackSilence();
                        window.localStream.getTracks().forEach(track => connections[socketListId].addTrack(track, window.localStream));
                    }
                })

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue

                        try {
                            window.localStream.getTracks().forEach(track => connections[id2].addTrack(track, window.localStream));
                        } catch (e) { }

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
                                })
                                .catch(e => console.log(e))
                        })
                    }
                }
            })
        })
    }

    let silence = () => {
        let ctx = new AudioContext()
        let oscillator = ctx.createOscillator()
        let dst = oscillator.connect(ctx.createMediaStreamDestination())
        oscillator.start()
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
    }
    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height })
        canvas.getContext('2d').fillRect(0, 0, width, height)
        let stream = canvas.captureStream()
        return Object.assign(stream.getVideoTracks()[0], { enabled: false })
    }

    let handleVideo = () => {
        if (window.localStream) {
            window.localStream.getVideoTracks().forEach(track => track.enabled = !video);
        }
        setVideo(!video);
    }

    let handleAudio = () => {
        if (window.localStream) {
            window.localStream.getAudioTracks().forEach(track => track.enabled = !audio);
        }
        setAudio(!audio)
    }

    const toggleLobbyVideo = () => {
        if (window.localStream && window.localStream.getVideoTracks().length > 0) {
            window.localStream.getVideoTracks()[0].enabled = !lobbyVideo;
            setLobbyVideo(!lobbyVideo);
        }
    };

    const toggleLobbyAudio = () => {
        if (window.localStream && window.localStream.getAudioTracks().length > 0) {
            window.localStream.getAudioTracks()[0].enabled = !lobbyAudio;
            setLobbyAudio(!lobbyAudio);
        }
    };

    useEffect(() => {
        if (screen !== undefined) {
            getDislayMedia(); // eslint-disable-line react-hooks/exhaustive-deps
        }
    }, [screen]) // getDislayMedia intentionally excluded — adding it would cause infinite re-renders
    let handleScreen = () => {
        setScreen(!screen);
    }

    let handleEndCall = () => {
        try {
            let tracks = localVideoref.current.srcObject.getTracks()
            tracks.forEach(track => track.stop())
        } catch (e) { }
        window.location.href = "/"
    }

    let closeChat = () => {
        setModal(false);
    }

    let handleRecord = async () => {
        if (isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            return;
        }

        try {
            // Record the user's screen + audio for the session recording
            const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            mediaRecorderRef.current = new MediaRecorder(displayStream);

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `Session_Recording_${new Date().getTime()}.webm`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                recordedChunksRef.current = []; // reset
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error starting recording:", err);
            alert("Could not start recording.");
        }
    }

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };



    let sendMessage = () => {
        console.log(socketRef.current);
        socketRef.current.emit('chat-message', message, username)
        setMessage("");

        // this.setState({ message: "", sender: username })
    }


    let connect = () => {
        setAskForUsername(false);
        getMedia();
    }


    return (
        <div>

            {askForUsername === true ?

                (<div className={styles.lobbyPage}>
                    <div className={styles.lobbyBox}>
                        <h2 style={{ color: '#0F172A', fontWeight: 800, margin: 0 }}>ClearRoute Secure Room</h2>
                        <p style={{ color: '#475569', marginBottom: '20px', fontSize: '14px' }}>
                            Hardware Pre-Check • Joining as: <strong style={{ color: '#0F52BA' }}>{username}</strong>
                        </p>

                        <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E2E8F0', backgroundColor: '#0F172A' }}>
                            <video ref={localVideoref} autoPlay muted style={{ width: '100%', display: 'block', opacity: lobbyVideo ? 1 : 0.2 }} />

                            {!lobbyVideo && (
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', textAlign: 'center' }}>
                                    <VideocamOffIcon style={{ fontSize: 40 }} />
                                    <p style={{ margin: 0 }}>Camera Off</p>
                                </div>
                            )}

                            <div style={{ position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '20px' }}>
                                <IconButton onClick={toggleLobbyVideo} disabled={!videoAvailable} style={{ backgroundColor: lobbyVideo ? '#0F52BA' : '#EF4444', color: 'white', padding: '12px' }}>
                                    {lobbyVideo ? <VideocamIcon /> : <VideocamOffIcon />}
                                </IconButton>
                                <IconButton onClick={toggleLobbyAudio} disabled={!audioAvailable} style={{ backgroundColor: lobbyAudio ? '#0F52BA' : '#EF4444', color: 'white', padding: '12px' }}>
                                    {lobbyAudio ? <MicIcon /> : <MicOffIcon />}
                                </IconButton>
                            </div>
                        </div>

                        <Button
                            variant="contained"
                            color="primary"
                            onClick={connect}
                            style={{
                                width: "100%",
                                padding: "12px",
                                fontSize: "1rem",
                                fontWeight: "bold",
                                borderRadius: "9999px",
                                backgroundColor: "#0F52BA",
                                marginTop: "10px"
                            }}
                        >
                            Join Secure Session
                        </Button>
                    </div>
                </div>) :


                <div className={styles.meetVideoContainer} style={{ gridTemplateColumns: showModal ? '3fr 1fr' : '1fr' }}>

                    <div className={styles.topBar}>
                        {/* <div className={styles.badge}>
                            [🔴 REC 00:00:00] &nbsp; Session ID: #{window.location.pathname.split('/').pop()}
                        </div> */}
                        {/* <div className={styles.badge}>
                            [ WebRTC Custom Media Gateway ]
                        </div> */}
                    </div>

                    <div className={styles.conferenceView} style={{ display: 'flex', flexDirection: 'row', gap: '15px', padding: '15px', height: 'calc(100vh - 100px)', overflow: 'hidden' }}>
                        {videos.length === 0 && (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '24px', fontWeight: 'bold' }}>
                                Waiting for others to join...
                            </div>
                        )}

                        {videos.length > 0 && (() => {
                            const pinnedVideo = videos.find(v => v.streamId === pinnedStreamId);
                            const unpinnedVideos = videos.filter(v => v !== pinnedVideo);

                            if (pinnedVideo) {
                                return (
                                    <div style={{ display: 'flex', width: '100%', height: '100%', gap: '15px' }}>
                                        {/* Main Pinned Video */}
                                        <div style={{ flex: 1, backgroundColor: '#0F172A', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '2px solid #0F52BA', boxShadow: '0 10px 25px rgba(15, 82, 186, 0.2)' }}>
                                            <video
                                                data-stream={pinnedVideo.streamId}
                                                ref={ref => {
                                                    if (ref && pinnedVideo.stream && ref.srcObject !== pinnedVideo.stream) {
                                                        ref.srcObject = pinnedVideo.stream;
                                                    }
                                                }}
                                                autoPlay
                                                muted={pinnedVideo.isLocalScreen}
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            />
                                            {/* Absolute Overlay for Clicking (Prevents video from swallowing clicks) */}
                                            <div onClick={handleUnpin} style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'pointer' }}></div>
                                            <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 12 }}>
                                                <Button variant="contained" color="error" onClick={handleUnpin} style={{ borderRadius: '8px', fontWeight: 'bold' }}>
                                                    UNPIN
                                                </Button>
                                            </div>
                                            <div style={{ position: 'absolute', bottom: '15px', left: '15px', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '6px 12px', fontSize: '12px', borderRadius: '6px', fontWeight: 'bold', zIndex: 11, pointerEvents: 'none' }}>
                                                📌 Click anywhere to Unpin
                                            </div>
                                        </div>

                                        {/* Sidebar for Unpinned */}
                                        {unpinnedVideos.length > 0 && (
                                            <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', paddingRight: '5px' }}>
                                                {unpinnedVideos.map(video => (
                                                    <div key={video.streamId} style={{ height: '180px', flexShrink: 0, backgroundColor: '#0F172A', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '2px solid #E2E8F0', transition: 'border 0.3s' }}>
                                                        <video
                                                            data-stream={video.streamId}
                                                            ref={ref => {
                                                                if (ref && video.stream && ref.srcObject !== video.stream) {
                                                                    ref.srcObject = video.stream;
                                                                }
                                                            }}
                                                            autoPlay
                                                            muted={video.isLocalScreen}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                        {/* Click Overlay */}
                                                        <div onClick={(e) => handlePin(e, video.streamId)} style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'pointer' }}></div>
                                                        <div style={{ position: 'absolute', bottom: '10px', left: '10px', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', fontSize: '10px', borderRadius: '4px', zIndex: 11, pointerEvents: 'none' }}>
                                                            Click anywhere to Pin
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            } else {
                                // Dynamic Grid Layout (Like Google Meet/Zoom)
                                const count = videos.length;
                                let gridStyle = { gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' };

                                if (count === 1) gridStyle = { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' };
                                else if (count === 2) gridStyle = { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr' };
                                else if (count <= 4) gridStyle = { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' };
                                else if (count <= 6) gridStyle = { gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr' };

                                return (
                                    <div style={{ display: 'grid', ...gridStyle, gap: '15px', width: '100%', height: '100%', flex: 1, minHeight: 0 }}>
                                        {videos.map(video => (
                                            <div key={video.streamId} style={{ backgroundColor: '#0F172A', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '2px solid #E2E8F0', height: '100%', width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                                <video
                                                    data-stream={video.streamId}
                                                    ref={ref => {
                                                        if (ref && video.stream && ref.srcObject !== video.stream) {
                                                            ref.srcObject = video.stream;
                                                        }
                                                    }}
                                                    autoPlay
                                                    muted={video.isLocalScreen}
                                                    style={{ flex: 1, width: '100%', height: '100%', objectFit: 'contain' }}
                                                />
                                                {/* Click Overlay */}
                                                <div onClick={(e) => handlePin(e, video.streamId)} style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'pointer' }}></div>
                                                <div style={{ position: 'absolute', bottom: '15px', left: '15px', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '6px 12px', fontSize: '12px', borderRadius: '6px', fontWeight: 'bold', zIndex: 11, pointerEvents: 'none' }}>
                                                    Click anywhere to Pin
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            }
                        })()}
                    </div>

                    {/* Local PIP Video */}
                    <video
                        className={styles.meetUserVideo}
                        ref={localVideoref}
                        autoPlay
                        muted
                        style={{
                            position: 'fixed',
                            bottom: '100px',
                            right: showModal ? 'calc(25% + 30px)' : '30px',
                            width: '200px',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '12px',
                            border: '3px solid #0F52BA',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                            zIndex: 50,
                            backgroundColor: '#0F172A',
                            transform: screen ? 'none' : 'scaleX(-1)',
                            transition: 'right 0.3s ease'
                        }}
                    />

                    {showModal ? <div className={styles.chatRoom}>

                        <div className={styles.chatContainer}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>💬 Chat</span>
                                <IconButton size="small" onClick={closeChat} style={{ color: '#64748B' }}>✕</IconButton>
                            </div>

                            <div className={styles.chattingDisplay}>

                                {messages.length !== 0 ? messages.map((item, index) => {
                                    const isFile = item.data.startsWith('FILE:');
                                    let fileName = '';
                                    let fileData = '';
                                    if (isFile) {
                                        const parts = item.data.split(':');
                                        fileName = parts[1];
                                        fileData = parts.slice(2).join(':'); // rest is data url
                                    }

                                    const isAgent = item.sender.includes('Agent') || item.sender === 'Admin';
                                    const messageClass = isAgent ? styles.agent : styles.customer;

                                    return (
                                        <div className={`${styles.chatMessage} ${messageClass}`} key={index}>
                                            <div className={styles.sender}>{item.sender}</div>
                                            {isFile ? (
                                                <a href={fileData} download={fileName} style={{ color: 'inherit', textDecoration: 'underline' }}>
                                                    📎 Download {fileName}
                                                </a>
                                            ) : (
                                                <div>{item.data}</div>
                                            )}
                                        </div>
                                    )
                                }) : <p style={{ color: '#475569', textAlign: 'center', marginTop: '20px' }}>No Messages Yet</p>}


                            </div>

                            <div className={styles.chattingArea} style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="file"
                                    id="file-upload"
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => {
                                                socketRef.current.emit('chat-message', `FILE:${file.name}:${ev.target.result}`, username);
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                                <Button variant="outlined" onClick={() => document.getElementById('file-upload').click()} style={{ borderRadius: '9999px', minWidth: '40px', padding: '10px' }}>
                                    📎
                                </Button>
                                <TextField fullWidth value={message} onChange={(e) => setMessage(e.target.value)} id="outlined-basic" placeholder="Type a message..." variant="outlined" size="small" />
                                <Button variant='contained' onClick={sendMessage} style={{ borderRadius: '9999px', backgroundColor: '#0F52BA' }}>Send</Button>
                            </div>


                        </div>
                    </div> : <></>}


                    <div className={styles.buttonContainers}>
                        <IconButton onClick={handleVideo} style={{ color: video ? "#0F172A" : "red" }}>
                            {(video === true) ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        <IconButton onClick={handleAudio} style={{ color: audio ? "#0F172A" : "red" }}>
                            {audio === true ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>

                        <IconButton onClick={handleScreen} style={{ color: screen ? "#0F52BA" : "#0F172A" }}>
                            {screen === true ? <ScreenShareIcon /> : <StopScreenShareIcon />}
                        </IconButton>

                        <Badge badgeContent={newMessages} max={999} color='error'>
                            <IconButton onClick={() => { setModal(!showModal); if (!showModal) setNewMessages(0); }} style={{ color: "#0F172A" }}>
                                <ChatIcon />                        </IconButton>
                        </Badge>

                        {role === 'Agent' && (
                            <Button
                                variant="contained"
                                color={isRecording ? "error" : "primary"}
                                onClick={handleRecord}
                                style={{ marginLeft: '10px', borderRadius: '9999px', fontWeight: 'bold' }}
                            >
                                {isRecording ? "⏹️ Stop Recording" : "⏺️ Start Record"}
                            </Button>
                        )}

                        <IconButton onClick={handleEndCall} style={{ color: "white", backgroundColor: "#EF4444", marginLeft: 'auto' }}>
                            <CallEndIcon />
                        </IconButton>

                    </div>

                    <div style={{ position: 'fixed', bottom: '10px', left: '10px', zIndex: 100, backgroundColor: 'rgba(0,0,0,0.8)', padding: '10px', borderRadius: '8px', color: 'white', fontSize: '12px' }}>
                        <strong>Judge Utility Panel</strong><br />
                        Current Role: {role}<br />
                        <Button size="small" variant="outlined" color="inherit" onClick={() => { localStorage.setItem('role', role === 'Agent' ? 'Customer' : 'Agent'); window.location.reload(); }} style={{ marginTop: '5px' }}>
                            Switch to {role === 'Agent' ? 'Customer' : 'Agent'} View
                        </Button>
                    </div>

                </div>

            }

        </div>
    )
}
