import { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = "http://localhost:4545";

const Chat = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const [messages, setMessages] = useState([]);
  const navigate = useNavigate();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(user);
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!currentUser?._id || !currentUser?.name) {
      navigate('/login');
      return;
    }

    socketRef.current = io(BACKEND_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketRef.current.on('connect', () => {
      socketRef.current.emit('user_connected', {
        userId: currentUser._id,
        userName: currentUser.name
      });
    });

    fetchUnreadCounts();

    socketRef.current.on('users_online', (users) => {
      const otherUsers = users.filter(user => user.userId !== currentUser._id);
      setOnlineUsers(otherUsers);
      setFilteredUsers(otherUsers);
    });

    socketRef.current.on('new_message', ({ message, sender }) => {
      if (selectedUser && sender === selectedUser.userId) {
        setMessages(prev => [...prev, message]);
        socketRef.current.emit('mark_as_read', message._id);
      } else {
        setUnreadCounts(prev => ({
          ...prev,
          [sender]: (prev[sender] || 0) + 1
        }));
      }
    });

    socketRef.current.on('message_read', (messageId) => {
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

  useEffect(() => {
    if (selectedUser) {
      loadChatHistory(selectedUser.userId);
    }
  }, [selectedUser]);

  const fetchUnreadCounts = async () => {
    try {
      if (!currentUser?._id) return;
      
      const response = await fetch(`${BACKEND_URL}/api/unread-count/${currentUser._id}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setMessages(data);
      
      const unreadMessages = data.filter(msg => !msg.isRead && msg.sender === userId);
      unreadMessages.forEach(msg => {
        socketRef.current.emit('mark_as_read', msg._id);
      });

      setUnreadCounts(prev => ({...prev, [userId]: 0}));
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim() && selectedUser) {
      const messageData = {
        senderId: currentUser._id,
        receiverId: selectedUser.userId,
        content: newMessage
      };
      
      socketRef.current.emit('private_message', messageData);
      
      const optimisticMessage = {
        _id: Date.now().toString(),
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

  const handleSearch = (e) => {
    const searchValue = e.target.value;
    setSearchTerm(searchValue);
    
    const results = onlineUsers.filter(user => 
      user.userName.toLowerCase().includes(searchValue.toLowerCase())
    );
    setFilteredUsers(results);
  };

  const handleLogout = () => {
    socketRef.current?.disconnect();
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-screen flex flex-col bg-gray-100">
      {/* Top Navbar */}
      <div className="w-full bg-blue-600 text-white p-2 md:p-4 flex justify-between items-center">
        <h1 className="text-lg md:text-xl font-bold">Welcome, {currentUser?.name}</h1>
        <button onClick={handleLogout} className="text-white hover:text-red-600 bg-black rounded-md px-2 py-1 md:px-4 md:py-2">
          <i className="fas fa-sign-out-alt">Logout</i>
        </button>
      </div>

      <div className="flex flex-1 flex-col md:flex-row h-[calc(100vh-64px)]">
        {/* Left Sidebar */}
        <div className="w-[40%] border-black border-1 bg-white border-r">
          <div className="p-2 md:p-4 border-b">
            <div className="flex justify-between items-center mb-2 md:mb-4">
              <h1 className="text-lg md:text-xl font-bold text-gray-800">Messages</h1>
            </div>
            <input
              type="text"
              placeholder="Search contacts..."
              className="w-full px-3 py-1 md:px-4 md:py-2 rounded-lg bg-gray-100 focus:outline-none"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          
          <div className="overflow-y-auto h-[calc(100vh-200px)] md:h-[calc(100vh-180px)]">
            {filteredUsers.map(user => (
              <div
                key={user.userId}
                onClick={() => setSelectedUser(user)}
                className={`flex items-center p-2 md:p-4 hover:bg-gray-50 cursor-pointer ${
                  selectedUser?.userId === user.userId ? 'bg-blue-50' : ''
                } ${user.userName.toLowerCase().includes(searchTerm.toLowerCase()) && searchTerm ? 'bg-blue-100' : ''}`}
              >
                <div className="relative">
                  <div className={`w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-bold ${
                    user.userName.toLowerCase().includes(searchTerm.toLowerCase()) && searchTerm ? 'bg-blue-600' : 'bg-blue-500'
                  }`}>
                    {user.userName[0].toUpperCase()}
                  </div>
                  <div className="absolute bottom-0 right-0 w-2 h-2 md:w-3 md:h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div className="ml-2 md:ml-4 flex-1">
                  <h3 className="font-semibold text-gray-800 text-sm md:text-base">{user.userName}</h3>
                  {unreadCounts[user.userId] > 0 && (
                    <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 md:px-2 md:py-1 rounded-full float-right">
                      {unreadCounts[user.userId]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="w-[60%] flex flex-col border-black border-2 ">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="p-2 md:p-4 bg-white border-b flex items-center">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                  {selectedUser.userName[0].toUpperCase()}
                </div>
                <div className="ml-2 md:ml-4">
                  <h2 className="font-semibold text-gray-800 text-sm md:text-base">{selectedUser.userName}</h2>
                  <p className="text-xs md:text-sm text-green-500">Online</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-2 md:p-4 bg-gray-50">
                <div className="space-y-2 md:space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={message._id || index}
                      className={`flex ${message.sender === currentUser._id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] md:max-w-[70%] rounded-lg px-3 py-1.5 md:px-4 md:py-2 ${
                          message.sender === currentUser._id
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-800'
                        } shadow`}
                      >
                        <p className="text-xs md:text-sm">{message.content}</p>
                        <div className={`text-[10px] md:text-xs mt-1 ${
                          message.sender === currentUser._id ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {new Date(message.createdAt).toLocaleTimeString()}
                          {message.sender === currentUser._id && (
                            <span className="ml-1 md:ml-2">{message.isRead ? '✓✓' : '✓'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <div className="p-2 md:p-4 bg-white border-t">
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-1.5 md:px-4 md:py-2 rounded-full border shadow-md text-white focus:outline-none focus:border-blue-500 text-sm md:text-base"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-blue-500 text-white rounded-full p-1.5 md:p-2 hover:bg-blue-600 disabled:opacity-50"
                  >
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                    </svg>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-500 p-4">
                <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                <p className="text-base md:text-xl font-semibold">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
