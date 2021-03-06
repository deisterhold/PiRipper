FROM balenalib/raspberrypi3-64-ubuntu-node:14-build as build

# Install Dependencies
RUN apt-get update -y \
    && apt-get install -y \
    python3 \
    libudev-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /root/ripper

# Copy package.json
COPY package.json package.json
COPY package-lock.json package-lock.json

# Install dependencies
RUN npm install

# Copy tsconfig source
COPY tsconfig.json tsconfig.json

# Copy typescript source
COPY ./src ./src

# Copy HTML source
COPY ./html ./html

# Transpile typescript
RUN npm run build

# Use Ubuntu with the latest version of NodeJs
FROM balenalib/raspberrypi3-64-ubuntu-node:14-run

# Enable udev events
ENV UDEV on

ARG DEBIAN_FRONTEND=noninteractive

# Install Dependencies
RUN apt-get update -y \
    && apt-get install -yq \
    cifs-utils \
    eject \
    genisoimage \
    mplayer \
    libdvd-pkg \
    libudev-dev \
    python3 \
    vlc \
    setcd \
    && dpkg-reconfigure libdvd-pkg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Add user for VLC to run under
RUN useradd -m vlcplayer

# Allow the user access to the drive
RUN usermod -a -G cdrom vlcplayer

# Disable LIRC
RUN echo "nolirc=yes" >> /etc/mplayer/mplayer.conf

# Set the app directory
WORKDIR /root/ripper

# Copy the node app
COPY --from=build /root/ripper /root/ripper

CMD ["npm", "run", "start"]
