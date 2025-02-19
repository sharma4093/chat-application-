import { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import io from 'socket.io-client';
import { Button, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
// import { BACKEND_URL } from '../config/config';

const Chat = () => {
  // State management for messages, users, and current chat
  
  const user = JSON.parse(localStorage.getItem("user")); // Get user from localStorage
  const userNameLocal = user?.name; // Get name from user object
  const userIdLocal = user?._id; // Get _id from user object
  const [userName, setUserName] = useState(userNameLocal);
  const [userId, setUserId] = useState(userIdLocal);
  const [messages, setMessages] = useState([]);
  
  const navigate = useNavigate();
  const [onlineUsers, setOnlineUsers] = useState([]); // Will now store full user objects
  const [selectedUser, setSelectedUser] = useState(null); // Changed to null initially
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(user); // Use the user from localStorage
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null); // For auto-scrolling
  const socketRef = useRef(null); // For persistent socket reference
  
  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!currentUser?._id || !currentUser?.name) {
      console.log('No user data available:', currentUser);
      navigate('/login');
      return;
    }

    // Initialize socket connection
    socketRef.current = io("https://chatnetscape-api.onrender.com", {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Handle socket connection errors
    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected successfully');
      // Connect to socket with both id and name
      socketRef.current.emit('user_connected', {
        userId: currentUser._id,
        userName: currentUser.name
      });
    });

    // Load unread counts
    fetchUnreadCounts();

    // Socket listeners
    socketRef.current.on('users_online', (users) => {
      console.log('Received online users:', users);
      // Filter out current user and store full user objects
      setOnlineUsers(users.filter(user => user.userId !== currentUser._id));
    });

    socketRef.current.on('new_message', ({ message, sender }) => {
      console.log('Received new message:', message, 'from:', sender);
      if (selectedUser && sender === selectedUser.userId) {
        setMessages(prev => [...prev, message]);
        socketRef.current.emit('mark_as_read', message._id);
      } else {
        // Update unread count for sender
        setUnreadCounts(prev => ({
          ...prev,
          [sender]: (prev[sender] || 0) + 1
        }));
      }
    });

    socketRef.current.on('message_read', (messageId) => {
      console.log('Message marked as read:', messageId);
      setMessages(prev => 
        prev.map(msg => 
          msg._id === messageId ? { ...msg, isRead: true } : msg
        )
      );
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off('connect_error');
        socketRef.current.off('connect');
        socketRef.current.off('users_online');
        socketRef.current.off('new_message');
        socketRef.current.off('message_read');
        socketRef.current.disconnect();
      }
    };
  }, [currentUser]);

  // Separate useEffect for selectedUser changes
  useEffect(() => {
    if (selectedUser) {
      loadChatHistory(selectedUser.userId);
    }
  }, [selectedUser]);

  const fetchUnreadCounts = async () => {
    try {
      if (!currentUser?._id) return;
      
      const response = await fetch(`${BACKEND_URL}/api/unread-count/${currentUser._id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const counts = await response.json();
      const countsMap = counts.reduce((acc, { _id, count }) => {
        acc[_id] = count;
        return acc;
      }, {});
      setUnreadCounts(countsMap);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  const loadChatHistory = async (userId) => {
    try {
      if (!currentUser?._id || !userId) return;

      const response = await fetch(`${BACKEND_URL}/api/messages/${currentUser._id}/${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Loaded chat history:', data);
      setMessages(data);
      
      // Mark messages as read
      const unreadMessages = data.filter(msg => 
        !msg.isRead && msg.sender === userId
      );
      
      unreadMessages.forEach(msg => {
        socketRef.current.emit('mark_as_read', msg._id);
      });

      // Clear unread count for selected user
      setUnreadCounts(prev => ({
        ...prev,
        [userId]: 0
      }));
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim() && selectedUser) {
      const messageData = {
        senderId: currentUser._id,
        receiverId: selectedUser.userId, // Changed from _id to userId
        content: newMessage
      };
      
      console.log('Sending message:', messageData);
      socketRef.current.emit('private_message', messageData);
      
      // Optimistically add message to UI
      const optimisticMessage = {
        _id: Date.now().toString(), // Temporary ID
        sender: currentUser._id,
        receiver: selectedUser.userId,
        content: newMessage,
        isRead: false,
        createdAt: new Date()
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
    }
  };

  const handleLogout = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col">
        {/* Search Header */}
        <div className="p-4 border-b">
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              className="w-full py-2 px-4 bg-gray-100 rounded-full text-sm focus:outline-none"
            />
            <span className="absolute right-4 top-2.5 text-gray-400">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
              </svg>
            </span>
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto">
          {onlineUsers.map(user => (
            <div
              key={user.userId}
              onClick={() => setSelectedUser(user)}
              className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 ${
                selectedUser?.userId === user.userId ? 'bg-purple-50' : ''
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold">
                {user.userName.charAt(0).toUpperCase()}
              </div>
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{user.userName}</h3>
                  {unreadCounts[user.userId] > 0 && (
                    <span className="bg-purple-600 text-white text-xs rounded-full px-2 py-1">
                      {unreadCounts[user.userId]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b flex items-center justify-between">
          {selectedUser ? (
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold">
                {selectedUser.userName.charAt(0).toUpperCase()}
              </div>
              <h2 className="ml-3 text-lg font-semibold">{selectedUser.userName}</h2>
            </div>
          ) : (
            <h2 className="text-lg font-semibold">Select a conversation</h2>
          )}
          <button onClick={handleLogout} className="text-gray-500 hover:text-gray-700">
            Logout
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={message._id || index}
              className={`flex ${message.sender === currentUser._id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                  message.sender === currentUser._id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p>{message.content}</p>
                <div className={`text-xs mt-1 ${
                  message.sender === currentUser._id ? 'text-purple-200' : 'text-gray-500'
                }`}>
                  {new Date(message.createdAt).toLocaleTimeString()}
                  {message.sender === currentUser._id && (
                    <span className="ml-2">{message.isRead ? '✓✓' : '✓'}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 p-2 border rounded-full focus:outline-none focus:border-purple-600"
              disabled={!selectedUser}
            />
            <button
              type="submit"
              disabled={!selectedUser || !newMessage.trim()}
              className="bg-purple-600 text-white rounded-full p-2 hover:bg-purple-700 disabled:opacity-50"
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
