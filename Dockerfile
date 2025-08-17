# Use the official Playwright Docker image
FROM mcr.microsoft.com/playwright:v1.54.0-jammy

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install project dependencies
RUN npm install

# Install extra fonts & libraries (fix text rendering issues)
RUN apt-get update && apt-get install -y \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libnss3 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxrender1 \
    libxshmfence1 \
    libxtst6 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy the rest of your application code
COPY . .

# Expose the port your Express app runs on
EXPOSE 3000

# Command to run your application
CMD ["node", "index.js"]
