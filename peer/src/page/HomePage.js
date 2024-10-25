// import React from 'react';
// import { useNavigate } from 'react-router-dom';
// import { v1 as uuidv1 } from 'uuid';

// // Styles
// const containerStyle = {
//   display: 'flex',
//   justifyContent: 'center',
//   alignItems: 'center',
//   height: '100vh',
//   backgroundColor: '#f0f2f5',
//   fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
// };

// const boxStyle = {
//   textAlign: 'center',
//   backgroundColor: '#fff',
//   padding: '40px',
//   borderRadius: '8px',
//   boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
// };

// const titleStyle = {
//   fontSize: '2.5rem',
//   color: '#333',
//   marginBottom: '20px',
// };

// const buttonStyle = {
//   backgroundColor: '#007BFF',
//   color: '#fff',
//   fontSize: '1rem',
//   padding: '10px 20px',
//   borderRadius: '5px',
//   border: 'none',
//   cursor: 'pointer',
//   transition: 'background-color 0.3s ease',
// };

// const buttonHoverStyle = {
//   backgroundColor: '#0056b3',
// };

// function HomePage() {
//   const navigate = useNavigate();
//   const [buttonHover, setButtonHover] = React.useState(false);

//   function new_editor() {
//     let new_id = uuidv1();
//     navigate('/' + new_id);
//   }

//   return (
//     <div style={containerStyle}>
//       <div style={boxStyle}>
//         <h1 style={titleStyle}>Welcome To Collaborative Text Editor</h1>
//         <button
//           style={buttonHover ? { ...buttonStyle, ...buttonHoverStyle } : buttonStyle}
//           onClick={new_editor}
//           onMouseEnter={() => setButtonHover(true)}
//           onMouseLeave={() => setButtonHover(false)}
//         >
//           Create New Collaborative Document
//         </button>
//       </div>
//     </div>
//   );
// }

// export default HomePage;


import {
  Box,
  Container,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";
import React from 'react'
import Login from "../components/Authentication/Login";
import Signup from "../components/Authentication/Signup";

const HomePage = () => {
  return (
    <Container maxW="xl" centerContent>
      <Box
        d="flex"
        justifyContent="center"
        p={3}
        bg="white"
        w="100%"
        m="40px 0 15px 0"
        borderRadius="lg"
        borderWidth="1px"
      >
        <Text fontSize="4xl" fontFamily="Work sans">
          SIGNAL - PROTOCOL
        </Text>
      </Box>
      <Box bg="white" w="100%" p={4} borderRadius="lg" borderWidth="1px">
        <Tabs isFitted variant="soft-rounded">
          <TabList mb="1em">
            <Tab>Login</Tab>
            <Tab>Sign Up</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Login />
            </TabPanel>
            <TabPanel>
              <Signup />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Container>
  );
}

export default HomePage




