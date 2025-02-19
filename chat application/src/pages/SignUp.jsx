import { useState } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
// import { BACKEND_URL } from '../config/config';

const SignUp = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: ''
  });

  const navigate = useNavigate();

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      name: '',
      email: '',
      password: ''
    };

    // Name validation
    if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
      isValid = false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    // Password validation
    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    setErrors({
      ...errors,
      [e.target.name]: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log(formData )
    
    if (!validateForm()) {
      return;
    }

    try {
      const response = await axios.post("http://localhost:4545/api/signup", formData);
      if(response.data.status === 1) {
        toast.success(response.data.message);
        navigate('/login');
      } else {
        toast.error(response.data.message);
      }
     
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.message || 'Registration failed');
    }
  };


    return (
            <>
              <div className=" w-[700px] flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8 border-2 border-gray-300 rounded-md">
                <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                  <img
                    alt="Your Company"
                    src="https://tailwindui.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
                    className="mx-auto h-10 w-auto"
                  />
                  <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900">
                    Register here with your account
                  </h2>
                </div>
        
                <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between">
                        <label htmlFor="name" className="block text-sm/6 font-medium text-gray-900">
                        Name
                        </label>
                      </div>
                      <div className="mt-2 shadow-md border-2">
                        <input
                          id="name"
                          name="name"
                          type="text"
                          required
                          autoComplete="name"
                          className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                          value={formData.name}
                          onChange={handleChange}
                        /> 
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label htmlFor="password" className="block text-sm/6 font-medium text-gray-900">
                        Email address
                        </label>
                      </div>
                      <div className="mt-2 shadow-md border-2">
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          autoComplete="email"
                          className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                          value={formData.email}
                          onChange={handleChange}
                        /> 
                      </div>
                    </div>
        
                    <div>
                      <div className="flex items-center justify-between">
                        <label htmlFor="password" className="block text-sm/6 font-medium text-gray-900">
                          Password
                        </label>
                      </div>
                      <div className="mt-2 border-2 shadow-md">
                        <input
                          id="password"
                          name="password"
                          type="password"
                          required
                          autoComplete="current-password"
                          className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                          value={formData.password}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
        
                    <div>
                      <button
                        type="submit"
                        className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        onClick={handleSubmit}
                      >
                        Sign up
                      </button>
                    </div>
                  </form>
        
                  <p className="mt-10 text-center text-sm/6 text-gray-500">
                    already member?{' '}
                    <Link to="/" className="font-semibold text-indigo-600 hover:text-indigo-500">
                      signin here 
                    </Link>
                  </p>
                </div>
              </div>
            </>
        
    )
  }
export default SignUp


  
