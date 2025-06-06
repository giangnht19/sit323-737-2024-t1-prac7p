# Node.js Cloud-Native Application

This repository contains a simple Node.js application containerized with Docker, deployed on Google Kubernetes Engine (GKE), and monitored using Google Cloud Operations Suite (Stackdriver).

---

## Features

- Node.js backend with Express.js
- MongoDB integration for data persistence
- Dockerized for containerized deployment
- Kubernetes manifests for deployment and service configuration
- Monitoring and logging with GCP Operations Suite

---

## Prerequisites

Make sure you have the following installed:

- [Git](https://github.com)
- [Visual Studio Code](https://code.visualstudio.com/)
- [Node.js](https://nodejs.org/en/download/)
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Google Cloud SDK (gcloud)](https://cloud.google.com/sdk/docs/install)
- [Kubectl](https://kubernetes.io/docs/tasks/tools/)

---

## Setup and Deployment

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/your-repo.git
cd your-repo
```

### 2. Build and run locally with Docker Compose

```bash
docker-compose up
```

### 3. Build and push Docker image to Google Container Registry
```bash
docker build -t gcr.io/YOUR_PROJECT_ID/node-app .
docker push gcr.io/YOUR_PROJECT_ID/node-app
```
Make sure to authenticate Docker with GCP before pushing:
```bash 
gcloud auth configure-docker
```

### 4. Create a Kubernetes cluster on GKE
```bash
gcloud container clusters create my-cluster --zone us-central1-a
gcloud container clusters get-credentials my-cluster --zone us-central1-a
```

### 5. Deploy the application to Kubernetes
```bash
kubectl apply -f deployment.yaml
```

### 6. Access the application
Retrieve the external IP of the service:
```bash
kubectl get service fashfrenzy-app-service
```