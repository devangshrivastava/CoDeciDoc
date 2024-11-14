// src/utils/peerConnection.js

export const createPeerConnection = (iceServers, eventHandlers) => {
    const pc = new RTCPeerConnection({
      iceServers,
      iceTransportPolicy: 'all',
      iceCandidatePoolSize: 10
    });
  
    // Set up ICE candidate handling
    pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          console.log('New ICE candidate:', JSON.stringify(candidate));
          sendIceCandidate(candidate);
        } else {
          console.log('ICE candidate gathering completed');
        }
      };
  
      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state change:', pc.iceConnectionState);
        setConnectionStatus(pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected') {
          clearTimeout(connectionTimeoutRef.current);
        }
      };
  
      pc.onconnectionstatechange = () => {
        console.log('Connection state change:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          console.log('Peers connected!');
          clearTimeout(connectionTimeoutRef.current);
        } else if (pc.connectionState === 'failed') {
          console.error('Connection failed. Attempting to restart ICE...');
          pc.restartIce();
        }
      };
  
      pc.onicegatheringstatechange = () => {
        console.log('ICE gathering state:', pc.iceGatheringState);
      };

      
    return pc;
  };
  