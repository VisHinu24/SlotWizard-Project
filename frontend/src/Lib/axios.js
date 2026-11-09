import axios from 'axios';

const BASE_URL = "http://localhost:5000/api/user"

const api = axios.create({
    baseURL : BASE_URL,
    withCredentials : true,
    timeout : 20000 // generation stops itself after ~2 s, so 20 s means something is wrong
})

// A message the student can act on, for any failed request.
export const errorMessage = (error, fallback) => {
    if (error?.code === "ECONNABORTED") return "The server took too long to answer. Please try again."
    if (!error?.response) return "Can't reach the server. Check your connection, or that the backend is running."
    return error.response.data?.message || fallback
}

export default api;