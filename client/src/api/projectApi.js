/**
 * @file projectApi.js
 */

import api from "./axiosInstance";

export const createProject = async (data) => {
  const res = await api.post("/projects", data);
  return res.data.data.project;
};

export const listProjects = async () => {
  const res = await api.get("/projects");
  return res.data.data.projects;
};

export const getProject = async (id) => {
  const res = await api.get(`/projects/${id}`);
  return res.data.data.project;
};

export const updateProject = async (id, data) => {
  const res = await api.patch(`/projects/${id}`, data);
  return res.data.data.project;
};

export const deleteProject = async (id) => {
  await api.delete(`/projects/${id}`);
};

export const joinProject = async (inviteCode) => {
  const res = await api.post("/projects/join", { inviteCode });
  return res.data.data.project;
};

export const regenerateInvite = async (id) => {
  const res = await api.post(`/projects/${id}/invite/regenerate`);
  return res.data.data.inviteCode;
};

export const leaveProject = async (id) => {
  await api.post(`/projects/${id}/leave`);
};
