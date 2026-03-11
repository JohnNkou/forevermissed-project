import axios from 'axios';
import { memorialEndpoint, tributeEndpoint, abonnementEndpoint, userCardEndpoint, orderEndpoint, memorialPictureEndpoint, memorialVideoEndpoint } from '../endpoint.js'

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Settings API
export const settingsApi = {
  getPublic: () => axios.get(`${API_URL}/api/settings`),
  getSite: () => axios.get(`${API_URL}/api/admin/settings/site`, { headers: getAuthHeaders() }),
  updateSite: (data) => axios.put(`${API_URL}/api/admin/settings/site`, data, { headers: getAuthHeaders() }),
  getLayout: () => axios.get(`${API_URL}/api/admin/settings/layout`, { headers: getAuthHeaders() }),
  updateLayout: (data) => axios.put(`${API_URL}/api/admin/settings/layout`, data, { headers: getAuthHeaders() })
};

// Form Fields API
export const formFieldsApi = {
  getPublic: () => axios.get(`${API_URL}/api/form-fields`),
  getAll: () => axios.get(`${API_URL}/api/admin/form-fields`, { headers: getAuthHeaders() }),
  create: (data) => axios.post(`${API_URL}/api/admin/form-fields`, data, { headers: getAuthHeaders() }),
  update: (id, data) => axios.put(`${API_URL}/api/admin/form-fields/${id}`, data, { headers: getAuthHeaders() }),
  delete: (id) => axios.delete(`${API_URL}/api/admin/form-fields/${id}`, { headers: getAuthHeaders() }),
  reorder: (data) => axios.put(`${API_URL}/api/admin/form-fields/reorder`, data, { headers: getAuthHeaders() })
};

// Memorials API
export const memorialsApi = {
  list: (params) => axios.get(memorialEndpoint, { params }),
  get: (id) => axios.get(`${memorialEndpoint}/${id}`),
  create: (data, onProgress) => axios.post(memorialEndpoint, data, { headers: getAuthHeaders(), onUploadProgress: onProgress }),
  getPictures: (id)=> axios.get(memorialPictureEndpoint.replace(':memorial_id', id)),
  addPicture: (id,form, {onProgress, signal})=> axios.post(memorialPictureEndpoint.replace(':memorial_id',id), form, { headers: getAuthHeaders(), onUploadProgress: onProgress }),
  deletePicture: (id,src)=> axios.delete(`${memorialPictureEndpoint.replace(':memorial_id', id)}?src=${btoa(src)}`, { headers: getAuthHeaders() }),
  getVideos: (id)=> axios.get(memorialVideoEndpoint.replace(':memorial_id', id)),
  addVideo: (id, form, {onProgress, signal})=> axios.post(memorialVideoEndpoint.replace(':memorial_id',id),form, { headers: getAuthHeaders(), onUploadProgress: onProgress }),
  deleteVideo: (id,src)=> axios.delete(`${memorialVideoEndpoint.replace(':memorial_id',id)}?src=${btoa(src)}`, { headers: getAuthHeaders() }),
  adminList: () => axios.get(`${API_URL}/api/admin/memorials`, { headers: getAuthHeaders() }),
  update: (id, data) => axios.put(`${API_URL}/api/admin/memorials/${id}`, data, { headers: getAuthHeaders() }),
  delete: (id) => axios.delete(`${API_URL}/api/admin/memorials/${id}`, { headers: getAuthHeaders() }),
};

// Tributes API
export const tributesApi = {
  list: (memorialId) => axios.get(tributeEndpoint.replace(':memorial_id',memorialId)),
  create: (memorialId, data) => axios.post(tributeEndpoint.replace(':memorial_id', memorialId), data)
};

// Users API
export const usersApi = {
  list: () => axios.get(`${API_URL}/api/users`, { headers: getAuthHeaders() }),
  add: (payload)=> axios.post(`${API_URL}/api/users`, payload , { headers:getAuthHeaders() }),
  get: (id) => axios.get(`${API_URL}/api/admin/users/${id}`, { headers: getAuthHeaders() }),
  update: (id, data) => axios.put(`${API_URL}/api/admin/users/${id}`, data, { headers: getAuthHeaders() }),
  delete: (id) => axios.delete(`${API_URL}/api/admin/users/${id}`, { headers: getAuthHeaders() }),
  list_cards: (id)=> axios.get(userCardEndpoint.replace(':user_id',id), { headers: getAuthHeaders() }),
  add_card: (id,new_card)=> axios.put(userCardEndpoint.replace(':user_id',id), new_card, { headers: getAuthHeaders() })
};

// Abonnement API
export const abonnementsApi = {
  list: ()=> axios.get(abonnementEndpoint, { headers: getAuthHeaders() }),
  get: (id)=> axios.get(`${abonnementEndpoint}/${id}`),
  order: (data)=> axios.post(orderEndpoint, data, { headers: getAuthHeaders() }),
  add: (payload)=> axios.post(abonnementEndpoint,payload, { headers: getAuthHeaders() })
}