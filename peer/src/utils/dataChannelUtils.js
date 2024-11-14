// dataChannelUtils.js

import * as Y from 'yjs';

export const setupDataChannelEvents = ({
  dataChannelRef,
  ydocRef,
  ytextRef,
  setText,
}) => {
  if (!dataChannelRef.current) return;

  dataChannelRef.current.onopen = () => {
    console.log('Data channel is open');

    // Set up Yjs awareness and update handlers
    ydocRef.current.on('update', (update) => {
      if (dataChannelRef.current?.readyState === 'open') {
        console.log('Sending Yjs update:', update);
        dataChannelRef.current.send(
          JSON.stringify({
            type: 'yjsUpdate',
            update: Array.from(update),
          })
        );
      }
    });

    // Send initial state when connection opens
    const initialUpdate = Y.encodeStateAsUpdate(ydocRef.current);
    dataChannelRef.current.send(
      JSON.stringify({
        type: 'yjsUpdate',
        update: Array.from(initialUpdate),
      })
    );
  };

  dataChannelRef.current.onmessage = (event) => {
    console.log('Received message:', event.data);
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'yjsUpdate') {
        // Convert array back to Uint8Array
        const update = new Uint8Array(data.update);
        Y.applyUpdate(ydocRef.current, update);

        // Update the text state to reflect changes
        setText(ytextRef.current.toString());
      }
    } catch (error) {
      console.error('Error processing received message:', error);
    }
  };

  dataChannelRef.current.onclose = () => {
    console.log('Data channel closed');
  };

  dataChannelRef.current.onerror = (error) => {
    console.error('Data channel error:', error);
  };
};
