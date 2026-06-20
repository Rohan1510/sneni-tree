import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

export const listMembers = () => api.get("/members").then(r => r.data);
export const createMember = (data) => api.post("/members", data).then(r => r.data);
export const updateMember = (id, data) => api.patch(`/members/${id}`, data).then(r => r.data);
export const deleteMember = (id) => api.delete(`/members/${id}`).then(r => r.data);

export const uploadPhoto = (id, file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post(`/members/${id}/photo`, form, {
    headers: { "Content-Type": "multipart/form-data" }
  }).then(r => r.data);
};

export const photoUrl = (path) => path ? `${API}/files/${path}` : null;
