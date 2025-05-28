import React, { useEffect, useState, useCallback } from "react";
import { useSocket } from "../context/SocketProvider";
import ReactPlayer from "react-player";
import peer from "../service/peer";

const RoomPage = () => {
  const socket = useSocket();
  const [myStream, setMyStream] = useState();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [remoteStream, setRemoteStream] = useState();

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined the room`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(stream);
  }, [remoteSocketId, socket]);

  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    const senders = peer.peer.getSenders();
    const tracks = myStream.getTracks();
    for (const track of tracks) {
      const isTrackAlreadyAdded = senders.some(sender => sender.track?.id === track.id);
      if (!isTrackAlreadyAdded) {
        peer.peer.addTrack(track, myStream);
      }
    }
  }, [myStream]);

  const handleCallAccepted = useCallback(({ ans }) => {
    peer.setLocalDescription(ans);
    sendStreams();
  }, [sendStreams]);

  const handleNegotiationNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  const handleNegotiationIncoming = useCallback(async ({ from, offer }) => {
    const ans = await peer.getAnswer(offer);
    socket.emit("peer:nego:done", { to: from, ans });
  }, [socket]);

  const handleNegotiationFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegotiationNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegotiationNeeded);
    };
  }, [handleNegotiationNeeded]);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incoming:call", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegotiationIncoming);
    socket.on("peer:nego:done", handleNegotiationFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incoming:call", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegotiationIncoming);
      socket.off("peer:nego:done", handleNegotiationFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncomingCall,
    handleCallAccepted,
    handleNegotiationIncoming,
    handleNegotiationFinal,
  ]);

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col items-center justify-center space-y-6 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Room Dashboard</h1>
        <p className="text-gray-400 mt-2">{remoteSocketId ? "🎉 Connected!" : "Waiting for others..."}</p>
      </div>
      <div className="flex gap-4">
        {remoteSocketId && (
          <button
            onClick={handleCallUser}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium"
          >
            Call
          </button>
        )}
        {myStream && (
          <button
            onClick={sendStreams}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium"
          >
            Send Stream
          </button>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-6">
        {myStream && (
          <div className="bg-gray-800 p-4 rounded-xl shadow-lg">
            <h2 className="text-center font-semibold mb-2">My Stream</h2>
            <ReactPlayer playing muted height="200px" width="300px" url={myStream} />
          </div>
        )}
        {remoteStream && (
          <div className="bg-gray-800 p-4 rounded-xl shadow-lg">
            <h2 className="text-center font-semibold mb-2">Remote Stream</h2>
            <ReactPlayer playing muted height="200px" width="300px" url={remoteStream} />
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomPage;
