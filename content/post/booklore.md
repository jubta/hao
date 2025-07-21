---
title: "Explore BookLore: Your Self-Hosted Digital Library Solution"
author: "HAO"
description: "Introducing BookLore, a self-hosted book management web application, including features, deployment guides, and a technology stack to help you quickly build your personal digital library."
tags: ["BookLore","Hugo","自托管","Docker","图书管理"]
keywords:
date: "2025-07-04"
image:
  src: "https://btso.dpdns.org/file/AgACAgUAAyEGAASrCUQtAAMRaH5Oy6t4_fB2WVgfhwcRg4zc1zcAAqfDMRtb5PBXthuB8P6qqfQBAAMCAAN4AAM2BA.jpg"
  alt: "2025"
  thumbnail:
    size: "170px"
    borders: "rounded-lg"
draft: false
categories:

---

Support thks : https://www.paypal.me/haotech....
<!--more-->

This GitHub **BookLore**, a **self-hosted web application**, is designed to help users **organize and manage their personal digital book collections**.It supports **PDF and eBooks**, provides a **built-in reader**, and can **automatically fetch book metadata from Goodreads, Amazon, and Google Books**. BookLore also features **multi-user support, OPDS 1.2 support, and optional OIDC authentication**, and can be easily deployed via **Docker**.BookLore also features **multi-user support**, OPDS 1.2 support, and optional OIDC authentication**

### 1. Install Docker & Docker Compose

Ensure you have [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed.

### 2. Create docker-compose.yml

Create a `docker-compose.yml` file with content:

```yaml
services:
  booklore:
    image: ghcr.io/adityachandelgit/booklore-app:latest
    container_name: booklore
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Etc/UTC
      - DATABASE_URL=jdbc:mariadb://mariadb:3306/booklore # Only modify this if you're familiar with JDBC and your database setup
      - DATABASE_USERNAME=booklore # Must match MYSQL_USER defined in the mariadb container
      - DATABASE_PASSWORD=your_secure_password # Use a strong password; must match MYSQL_PASSWORD defined in the mariadb container 
      - SWAGGER_ENABLED=false # Enable or disable Swagger UI (API docs). Set to 'true' to allow access; 'false' to block access (recommended for production).
    depends_on:
      mariadb:
        condition: service_healthy
    ports:
      - "6060:6060"
    volumes:
      - /your/local/path/to/booklore/data:/app/data
      - /your/local/path/to/booklore/books:/books
    restart: unless-stopped

  mariadb:
    image: lscr.io/linuxserver/mariadb:11.4.5
    container_name: mariadb
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Etc/UTC
      - MYSQL_ROOT_PASSWORD=super_secure_password # Use a strong password for the database's root user, should be different from MYSQL_PASSWORD
      - MYSQL_DATABASE=booklore
      - MYSQL_USER=booklore # Must match DATABASE_USERNAME defined in the booklore container
      - MYSQL_PASSWORD=your_secure_password # Use a strong password; must match DATABASE_PASSWORD defined in the booklore container
    volumes:
      - /your/local/path/to/mariadb/config:/config
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mariadb-admin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 5s
      retries: 10
```

### 3. Start the Containers

Run the following command to start the services:

```ini
docker compose up -d
```

### 4. Access BookLore

Once the containers are up, access BookLore in your browser at:

```ini
http://localhost:6060
```

## 🔑 OIDC/OAuth2 Authentication (Authentik, Pocket ID, etc.)

BookLore supports optional OIDC/OAuth2 authentication for secure access. This feature allows you to integrate external authentication providers for a seamless login experience.

While the integration has been tested with **Authentik** and **Pocket ID**, it should work with other OIDC providers like **Authelia** as well. The setup allows you to use either JWT-based local authentication or external providers, giving users the flexibility to choose their preferred method.

For detailed instructions on setting up OIDC authentication:

- 📺 [YouTube video on configuring Authentik with BookLore](https://www.youtube.com/watch?v=r6Ufh9ldF9M)
- 📘 [Step-by-step setup guide for Pocket ID](docs/OIDC-Setup-With-PocketID.md)

## 🔐 Remote Authentication (Trusted Header SSO, Forward Auth)

If you run BookLore behind a reverse proxy with remote authentication (middleware),
you can enable automatic login by setting `REMOTE_AUTH_ENABLED` to `true`.

This allows you to use your existing authentication system (e.g., OAuth, SAML) to log in to BookLore.

remote auth environment variables can be configured:

<div style="overflow-x:auto; -webkit-overflow-scrolling:touch;">

| Variable Name                | Description                             | Default Value                                                       |
|------------------------------|-----------------------------------------|---------------------------------------------------------------------|
| REMOTE_AUTH_ENABLED          | Enable remote authentication            | `false`                                                             |
| REMOTE_AUTH_CREATE_NEW_USERS | Auto-create users from remote auth      | `true`                                                              |
| REMOTE_AUTH_HEADER_NAME      | HTTP header containing user's name      | `Remote-Name`                                                       |
| REMOTE_AUTH_HEADER_USER      | HTTP header containing username         | `Remote-User`                                                       |
| REMOTE_AUTH_HEADER_EMAIL     | HTTP header containing user's email     | `Remote-Email`                                                      |
| REMOTE_AUTH_HEADER_GROUPS    | HTTP header containing user's groups    | `Remote-Groups`                                                     |
| REMOTE_AUTH_ADMIN_GROUP      | Group name that grants admin privileges | -

</div>

---

#### **Links**

##### **<font style="background: "> IF want Support Me :</font>** 
**[Click](https://www.paypal.me/haotech)**

##### **<font style="background: "> Important !: </font>** 
**[Click](https://www.patreon.com/hao8?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink)**

If you think my article is good, stay stuned! it's awesome, have a great day!

