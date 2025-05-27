import React, {useEffect, useState} from 'react';
import { useSocket } from '../context/SocketProvider';
import { useCallback } from 'react';
import ReactPlayer from "react-player";
import peer from '../service/peer'

const RoomPage = ()=> {

    const socket = useSocket();
    const [myStream,setMyStream] = useState()
    const [remoteSocketId, setRemoteSocketId] = useState(null);
    const [remoteStream, setRemoteStream] = useState();
    
    const handleUserJoined = useCallback(({email,id})=> {
        console.log(`Email ${email} joined the room`);
        setRemoteSocketId(id);
    },[]);

    const handleCallUser = useCallback(async ()=> {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio:true, 
            video:true
        });
        const offer = await peer.getOffer();
        socket.emit("user:call", {to: remoteSocketId, offer});
        setMyStream(stream);
    },[remoteSocketId,socket]);

    const handleIncomingCall = useCallback(async ({from,offer})=> {
        setRemoteSocketId(from);
        const stream = await navigator.mediaDevices.getUserMedia({
            audio:true, 
            video:true
        });
        setMyStream(stream);
        console.log(`Incoming call`, from, offer);
        const ans = await peer.getAnswer(offer);
        socket.emit("call:accepted", {to:from,ans})
    },[socket]);

    const sendStreams = useCallback(()=> {
        const senders = peer.peer.getSenders();
        const tracks = myStream.getTracks();
        for(const track of tracks) {
            const isTrackAlreadyAdded = senders.some(sender => sender.track?.id === track.id);
            if (!isTrackAlreadyAdded) {
                peer.peer.addTrack(track, myStream);
            }
        }
    },[myStream])

    const handleCallAccepted = useCallback(async ({from, ans})=> {
        peer.setLocalDescription(ans);
        console.log("Call Accepted");
        sendStreams();
    },[sendStreams]);

    const handleNegotiationNeeded = useCallback(async ()=> {
        const offer = await peer.getOffer();
        socket.emit("peer:nego:needed", {offer, to:remoteSocketId});
    },[remoteSocketId,socket]);

    const handleNegotiationIncoming = useCallback(async ({from,offer})=> {
        const ans = await peer.getAnswer(offer);
        socket.emit("peer:nego:done", {to:from, ans});
    },[socket]);

    const handleNegotiationFinal = useCallback(async ({ans})=> {
        await peer.setLocalDescription(ans);
    },[]);

    useEffect(()=> {
        peer.peer.addEventListener("negotiationneeded", handleNegotiationNeeded);
        return ()=> {
            peer.peer.removeEventListener("negotiationneeded", handleNegotiationNeeded);
        }
    },[handleNegotiationNeeded])

    useEffect(()=> {
        peer.peer.addEventListener("track", async (ev)=> {
            const remoteStream = ev.streams;
            setRemoteStream(remoteStream[0]);
        });

    },[])

    useEffect(()=> {
        socket.on("user:joined", handleUserJoined);
        socket.on("incoming:call", handleIncomingCall);
        socket.on("call:accepted",handleCallAccepted);
        socket.on("peer:nego:needed", handleNegotiationIncoming);
        socket.on("peer:nego:done", handleNegotiationFinal);

        return ()=> {
            socket.off("user:joined",handleUserJoined);
            socket.off("incoming:call", handleIncomingCall);
            socket.off("call:accepted",handleCallAccepted);
            socket.off("peer:nego:needed", handleNegotiationIncoming);
            socket.off("peer:nego:done", handleNegotiationFinal);
        }
    },[socket,handleUserJoined,handleIncomingCall,handleCallAccepted,handleNegotiationIncoming,handleNegotiationFinal]);


    return (
        <div>
            <h1>Room Page</h1>
            <h4>{remoteSocketId? 'Connected': 'No one in room'}</h4>
            {myStream && <button onClick={sendStreams}>Send Stream</button>}
            {
                remoteSocketId && <button onClick={handleCallUser}>Call</button>
            }
            {myStream && (
              <>
              
                <h1>My Stream</h1>
                {
                <ReactPlayer
                 playing 
                 muted
                 height='200px' 
                 width='300px'
                 url={myStream}/>
                }
              
              </>

            )}
            {remoteStream && (
              <>
              
                <h1>Remote Stream</h1>
                {
                <ReactPlayer
                 playing 
                 muted
                 height='200px' 
                 width='300px'
                 url={remoteStream}/>
                }
              
              </>

            )}

        </div>
    )
}

export default RoomPage;