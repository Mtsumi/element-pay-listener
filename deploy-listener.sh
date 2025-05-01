#!/bin/bash
ssh element-server << 'EOF'
  cd /root/element-pay-listener
  git pull origin dev
  npm install
  pm2 restart listener || pm2 start listener.js --name listener
EOF
