// dataChannelUtils.js
import * as Y from 'yjs';
import { debounce } from 'lodash';

const SYNC_MESSAGE_TYPES = {
  SYNC_STEP1: 'sync-step1',
  SYNC_STEP2: 'sync-step2',
  SYNC_UPDATE: 'sync-update',
};

export class YjsSyncManager {
  constructor({ ydoc, dataChannel, setText }) {
    this.ydoc = ydoc;
    this.dataChannel = dataChannel;
    this.setText = setText;
    this.ytext = ydoc.getText('shared');
    this.isReady = false;
    this.pendingUpdates = [];
    
    // Debounced update sender to batch changes
    this.sendUpdate = debounce(this._sendUpdate.bind(this), 50);
    
    // Track update origin to prevent loops
    this.updateOrigin = null;
  }

  initialize() {
    try {
      // Set up update handler with origin tracking
      this.ydoc.on('update', (update, origin) => {
        if (origin !== 'remote' && this.dataChannel?.readyState === 'open') {
          this.sendUpdate(update);
        }
      });

      // Set up text observer with transactions
      this.ytext.observe(event => {
        if (event.transaction.origin !== 'remote') {
          this.ydoc.transact(() => {
            this.setText(this.ytext.toString());
          }, 'local');
        }
      });

      this.setupDataChannelHandlers();
      this.isReady = true;
      
      // Request initial sync
      this.requestSync();
    } catch (error) {
      console.error('Error initializing YjsSyncManager:', error);
      throw new Error('Failed to initialize YJS sync');
    }
  }

  setupDataChannelHandlers() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('Data channel opened - requesting sync');
      this.requestSync();
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };

    this.dataChannel.onclose = () => {
      this.cleanup();
    };
  }

  handleMessage(message) {
    try {
      switch (message.type) {
        case SYNC_MESSAGE_TYPES.SYNC_STEP1:
          this.handleSyncStep1(message);
          break;
        case SYNC_MESSAGE_TYPES.SYNC_STEP2:
          this.handleSyncStep2(message);
          break;
        case SYNC_MESSAGE_TYPES.SYNC_UPDATE:
          this.handleUpdate(message);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  requestSync() {
    if (!this.isReady || this.dataChannel?.readyState !== 'open') return;

    const sv = Y.encodeStateVector(this.ydoc);
    this.sendMessage({
      type: SYNC_MESSAGE_TYPES.SYNC_STEP1,
      sv: Array.from(sv)
    });
  }

  handleSyncStep1(message) {
    // Handle first step of sync protocol
    const sv = new Uint8Array(message.sv);
    const update = Y.encodeStateAsUpdate(this.ydoc, sv);
    
    this.sendMessage({
      type: SYNC_MESSAGE_TYPES.SYNC_STEP2,
      update: Array.from(update)
    });
  }

  handleSyncStep2(message) {
    // Handle second step of sync protocol
    this.applyUpdate(message.update);
  }

  handleUpdate(message) {
    this.applyUpdate(message.update);
  }

  applyUpdate(updateArray) {
    try {
      const update = new Uint8Array(updateArray);
      this.ydoc.transact(() => {
        Y.applyUpdate(this.ydoc, update, 'remote');
      }, 'remote');
    } catch (error) {
      console.error('Error applying update:', error);
      this.requestSync(); // Request full sync on error
    }
  }

  _sendUpdate(update) {
    if (!this.isReady || this.dataChannel?.readyState !== 'open') {
      this.pendingUpdates.push(update);
      return;
    }

    this.sendMessage({
      type: SYNC_MESSAGE_TYPES.SYNC_UPDATE,
      update: Array.from(update)
    });
  }

  sendMessage(message) {
    try {
      if (this.dataChannel?.readyState === 'open') {
        this.dataChannel.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  cleanup() {
    this.isReady = false;
    this.sendUpdate.cancel();
    this.pendingUpdates = [];
    
    // Clean up observers and handlers
    this.ydoc.off('update');
    this.ytext.unobserve();
  }
}

// Usage in your Editor component:
export const setupDataChannelEvents = ({
  dataChannelRef,
  ydocRef,
  ytextRef,
  setText,
}) => {
  let syncManager = null;

  const initializeSync = () => {
    try {
      syncManager = new YjsSyncManager({
        ydoc: ydocRef.current,
        dataChannel: dataChannelRef.current,
        setText
      });
      syncManager.initialize();
    } catch (error) {
      console.error('Failed to initialize sync:', error);
    }
  };

  if (dataChannelRef.current) {
    dataChannelRef.current.onopen = () => {
      console.log('Data channel opened');
      initializeSync();
    };

    dataChannelRef.current.onclose = () => {
      console.log('Data channel closed');
      syncManager?.cleanup();
    };

    dataChannelRef.current.onerror = (error) => {
      console.error('Data channel error:', error);
      syncManager?.cleanup();
    };
  }

  // Return cleanup function
  return () => {
    syncManager?.cleanup();
  };
};