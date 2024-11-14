export const handleOffer = async ({
    offer,
    senderEmail,
    setPeerEmail,
    peerEmailRef,
    createPeerConnection,
    dataChannelRef,
    setupDataChannelEvents,
    ydocRef,
    ytextRef,
    setText,
    socketRef,
    userEmail,
  }) => {
    try {
      setPeerEmail(senderEmail);
      peerEmailRef.current = senderEmail;
      const pc = createPeerConnection();
  
      pc.ondatachannel = (event) => {
        dataChannelRef.current = event.channel;
        setupDataChannelEvents({
          dataChannelRef,
          ydocRef,
          ytextRef,
          setText,
        });
      };
  
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
  
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
  
      socketRef.current.emit('answer', {
        answer: pc.localDescription,
        senderEmail: userEmail,
        receiverEmail: peerEmailRef.current,
      });
    } catch (error) {
      console.error('Error during offer handling:', error);
    }
  };

  export const handleAnswer = async ({
    answer,
    peerConnectionRef,
  }) => {
    try {
      const pc = peerConnectionRef.current;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('Remote description set successfully (answer)');
    } catch (error) {
      console.error('Error during answer handling:', error);
    }
  };


  export const handleCandidate = async ({
    candidate,
    peerConnectionRef,
    iceCandidatesQueue,
  }) => {
    try {
      const pc = peerConnectionRef.current;
  
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('ICE candidate added successfully');
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      } else {
        console.log('Queueing ICE candidate');
        iceCandidatesQueue.current.push(candidate);
      }
    } catch (error) {
      console.error('Error during candidate handling:', error);
    }
  };
  
  