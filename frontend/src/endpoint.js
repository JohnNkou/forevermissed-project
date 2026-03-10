const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const api = `${API_URL}/api`;
export const memorialEndpoint = `${api}/memorials`;
export const tributeEndpoint = `${memorialEndpoint}/:memorial_id/tributes`;
export const userEndpoint = `${api}/users`;
export const adminUserEndpoint = `${api}/admin/users`
export const orderEndpoint = `${api}/order/`;
export const abonnementEndpoint = `${api}/abonnements`
export const userCardEndpoint = `${userEndpoint}/:user_id/cards`
export const memorialVideoEndpoint = `${memorialEndpoint}/:memorial_id/videos`
export const memorialPictureEndpoint = `${memorialEndpoint}/:memorial_id/pictures`