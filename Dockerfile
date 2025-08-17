# Use an official Node.js image as the base.
# It is a good practice to use a specific version.
FROM node:22-bullseye-slim

# Install the necessary system dependencies for Playwright.
# This is the key step to avoid the "Authentication failure" and "Missing libraries" errors.
# The list of dependencies can be found in the Playwright documentation.
# The `apt-get` command needs to run as root, which is the default user in this base image.
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libgconf-2-4 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libcups2 \
    libxcomposite1 \
    libxkbcommon0 \
    libxrandr2 \
    libxi6 \
    libxtst6 \
    libfontconfig1 \
    libfreetype6 \
    libjpeg-turbo8 \
    libpng16-16 \
    libwebp6 \
    libxml2 \
    libxslt1.1 \
    libglib2.0-0 \
    libgdk-pixbuf2.0-0 \
    libenchant-2-2 \
    libgraphene-1.0-0 \
    libsecret-1-0 \
    libmanette-0.2-0 \
    libavif15 \
    libgstreamer-gl1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    libgstreamer-plugins-good1.0-0 \
    libgstcodecparsers-1.0-0 \
    libgstgl-1.0-0 \
    --no-install-recommends

# Create a non-root user for security best practices.
# Using a non-root user avoids potential security risks.
RUN groupadd -r playwright && useradd --no-log-init -r -g playwright playwright
USER playwright

# Set the working directory inside the container
WORKDIR /home/playwright

# Copy package.json and package-lock.json to leverage Docker layer caching
COPY --chown=playwright:playwright package*.json ./

# Install project dependencies, including Playwright
RUN npm install

# Install the browser binaries for Playwright
RUN npx playwright install --with-deps

# Copy the rest of your application code
COPY --chown=playwright:playwright . .

# Expose the port your Express app listens on
EXPOSE 3000

# Command to run your application when the container starts
CMD ["node", "index.js"]