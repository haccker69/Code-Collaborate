/**
 * @file fileApi.js
 */

import api from "./axiosInstance";

export const getFileTree = async (projectId) => {
  const res = await api.get(`/projects/${projectId}/files`);
  return res.data.data.files;
};

export const getChildren = async (projectId, folderId) => {
  const res = await api.get(`/projects/${projectId}/files/${folderId}/children`);
  return res.data.data.files;
};

export const getFile = async (fileId) => {
  const res = await api.get(`/files/${fileId}`);
  return res.data.data.file;
};

export const createFile = async (projectId, data) => {
  const res = await api.post(`/projects/${projectId}/files`, data);
  return res.data.data.file;
};

export const renameFile = async (fileId, name) => {
  const res = await api.patch(`/files/${fileId}/rename`, { name });
  return res.data.data.file;
};

/**
 * Saves file content — called on debounced autosave from the editor.
 * @param {string} fileId
 * @param {string} content
 */
export const saveContent = async (fileId, content) => {
  await api.patch(`/files/${fileId}/content`, { content });
};

export const deleteFile = async (fileId) => {
  await api.delete(`/files/${fileId}`);
};

export const exportProject = async (projectId) => {
  const res = await api.get(`/projects/${projectId}/export`);
  return res.data.data.files;
};
