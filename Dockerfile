# Use the official Playwright Docker image.
# It includes Node.js and all browser dependencies.
# The 'jammy' tag is for Ubuntu 22.04 LTS.
FROM mcr.microsoft.com/playwright:v1.54.0-jammy

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the port your Express app runs on
EXPOSE 3000

# Command to run your application
CMD ["node", "index.js"]