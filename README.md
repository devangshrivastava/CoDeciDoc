# 📝 Collaborative Text Editor

Welcome to the *Collaborative Text Editor! This project allows multiple users to collaboratively edit text documents in real-time. It leverages **WebRTC* for peer-to-peer communication, *WebSocket* for signaling, and *Yjs* for real-time text synchronization.

## 🚀 Features

- *Real-Time Collaboration:* Edit documents simultaneously with other users.
- *Peer-to-Peer Connections:* Uses WebRTC for efficient and decentralized communication.
- *Signaling Server:* Establishes connections using WebSocket-based signaling.
- *Unique Document IDs:* Each collaboration session is assigned a unique identifier.
- *User-Friendly Interface:* Simple and intuitive design for seamless collaboration.

---

## 🛠️ Project Structure

The project is divided into two main components:

### 1. *Frontend* 
   - *Location:* peer/ directory
   - *Technology:* Built with *React.js*
   - *Purpose:* Provides the user interface for collaborative editing and integrates WebRTC for peer-to-peer communication.

### 2. *Backend*
   - *Location:* central-backend-server/ directory
   - *Technology:* Built with *Node.js*
   - *Purpose:* Acts as a signaling server for establishing WebRTC connections using WebSocket.

---

## 🖥️ Setup Instructions

Follow these steps to set up the Collaborative Text Editor on your local machine:

### 1. Clone the Repository

bash
git clone https://github.com/your-username/collaborative-text-editor.git
cd collaborative-text-editor 


### 2. Install Dependencies

#### For Frontend (React.js):

bash
cd peer
npm install
 

###For Backend (Node.js):

bash
cd ../central-backend-server
npm install


###3. Run the Application

###Start the Backend Server:


cd central-backend-server
npm start


###Start the Frontend:


cd ../peer
npm start

The application will now be accessible in your browser at http://localhost:3000.

---

## 🌟 Usage

1. Open the application in your browser.
2. Enter a unique document ID or create a new one.
3. Share the document ID with collaborators.
4. Start editing the document together in real-time, with changes synchronized instantly.

---

## 🤝 Contributing

We welcome contributions to make this project even better! Here's how you can contribute:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
   bash
   git checkout -b feature-name
   
3. Commit your changes
  bash
   git commit -m "Add your message here"
   
4. Push to your branch
  bash
   git push origin feature-name
   
5. Open a pull request explaining your changes.

Feel free to open issues or submit pull requests to enhance the project. Contributions are greatly appreciated!

--- 

## 📄 License

This project is licensed under the *MIT License*. You are free to use, modify, and distribute this software under the terms of the license. See the [LICENSE](LICENSE) file for more details.

---

## 📧 Contact

If you have any questions, suggestions, or feedback, feel free to reach out:

- *GitHub:* [your-github-username]([https://github.com/your-github-username](https://github.com/devangshrivastava))

---
