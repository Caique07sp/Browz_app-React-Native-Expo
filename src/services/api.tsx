import axios from "axios";

const api = axios.create({
  baseURL: "https://browz.com.br/rest.php",
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;