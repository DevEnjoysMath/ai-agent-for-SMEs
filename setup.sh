#!/bin/bash

# =============================================================================
# AI Booking Agent - Setup Script
# Automates initial configuration and deployment setup
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}=================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}=================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main setup
main() {
    print_header "AI Booking Agent - Initial Setup"

    echo "This script will help you set up the AI Booking Agent."
    echo "Please have your API credentials ready."
    echo ""

    # Check system requirements
    print_header "1. Checking System Requirements"

    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node -v)
        print_success "Node.js installed: $NODE_VERSION"

        # Check version (should be v18 or higher)
        NODE_MAJOR=$(node -v | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -lt 18 ]; then
            print_warning "Node.js version should be v18 or higher"
            print_info "Current version: $NODE_VERSION"
            print_info "Please update Node.js: https://nodejs.org/"
        fi
    else
        print_error "Node.js is not installed"
        print_info "Install from: https://nodejs.org/"
        exit 1
    fi

    # Check npm
    if command_exists npm; then
        NPM_VERSION=$(npm -v)
        print_success "npm installed: $NPM_VERSION"
    else
        print_error "npm is not installed"
        exit 1
    fi

    # Check Docker (optional)
    if command_exists docker; then
        DOCKER_VERSION=$(docker -v | cut -d' ' -f3 | sed 's/,//')
        print_success "Docker installed: $DOCKER_VERSION (optional)"
        DOCKER_AVAILABLE=true
    else
        print_warning "Docker not found (optional for deployment)"
        DOCKER_AVAILABLE=false
    fi

    # Create necessary directories
    print_header "2. Creating Directories"

    mkdir -p bookings confirm states logs
    print_success "Created: bookings/, confirm/, states/, logs/"

    # Check for .env file
    print_header "3. Environment Configuration"

    if [ -f ".env" ]; then
        print_warning ".env file already exists"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Keeping existing .env file"
        else
            cp .env.example .env
            print_success "Created new .env file from template"
        fi
    else
        cp .env.example .env
        print_success "Created .env file from template"
    fi

    echo ""
    print_warning "IMPORTANT: You must edit .env and add your credentials!"
    echo ""
    print_info "Required credentials:"
    echo "  1. Twilio Account SID and Auth Token"
    echo "  2. Google Gemini API Key"
    echo "  3. Google Service Account Key (JSON)"
    echo "  4. Business information (owner phone, etc.)"
    echo ""

    read -p "Do you want to edit .env now? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        if command_exists nano; then
            nano .env
        elif command_exists vim; then
            vim .env
        elif command_exists vi; then
            vi .env
        else
            print_warning "No text editor found. Please edit .env manually"
        fi
    fi

    # Install dependencies
    print_header "4. Installing Dependencies"

    if [ -d "node_modules" ]; then
        print_info "node_modules exists. Updating dependencies..."
        npm update
    else
        print_info "Installing dependencies (this may take a few minutes)..."
        npm install
    fi

    print_success "Dependencies installed successfully"

    # Security check
    print_header "5. Security Check"

    # Run npm audit
    print_info "Running security audit..."
    if npm audit --audit-level=high; then
        print_success "No high/critical vulnerabilities found"
    else
        print_warning "Vulnerabilities found. Run 'npm audit fix' to fix them"
    fi

    # Check for sensitive files
    if [ -f "google-calendar-service-account.json" ]; then
        print_error "Found google-calendar-service-account.json"
        print_warning "This file should NOT exist. Credentials should be in .env"
    fi

    # Verify .env is gitignored
    if git check-ignore -q .env; then
        print_success ".env is properly gitignored"
    else
        print_error ".env is NOT gitignored!"
        print_warning "Add .env to .gitignore immediately!"
    fi

    # Deployment options
    print_header "6. Choose Deployment Method"

    echo "How would you like to run the application?"
    echo ""
    echo "1) Node.js directly (npm start)"
    echo "2) Docker (recommended for production)"
    echo "3) PM2 Process Manager"
    echo "4) Skip (configure manually later)"
    echo ""

    read -p "Enter choice [1-4]: " -n 1 -r
    echo ""

    case $REPLY in
        1)
            print_info "Starting with Node.js..."
            echo ""
            print_success "Setup complete! Starting application..."
            echo ""
            npm start
            ;;
        2)
            if [ "$DOCKER_AVAILABLE" = true ]; then
                print_info "Starting with Docker Compose..."
                echo ""

                # Build Docker image
                print_info "Building Docker image..."
                docker-compose build

                print_success "Docker image built successfully"
                echo ""

                read -p "Start the application now? (Y/n): " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Nn]$ ]]; then
                    docker-compose up -d
                    echo ""
                    print_success "Application started!"
                    print_info "View logs: docker-compose logs -f"
                    print_info "Check status: docker-compose ps"
                    print_info "Stop: docker-compose down"
                fi
            else
                print_error "Docker is not installed"
                print_info "Install Docker: https://docs.docker.com/get-docker/"
            fi
            ;;
        3)
            if command_exists pm2; then
                print_info "Starting with PM2..."
                pm2 start index.js --name ai-booking-agent
                pm2 save
                print_success "Application started with PM2!"
                print_info "Monitor: pm2 monit"
                print_info "Logs: pm2 logs ai-booking-agent"
                print_info "Restart: pm2 restart ai-booking-agent"
            else
                print_warning "PM2 is not installed"
                print_info "Install PM2: npm install -g pm2"
                print_info "Then run: pm2 start index.js --name ai-booking-agent"
            fi
            ;;
        4)
            print_info "Skipping deployment"
            ;;
        *)
            print_warning "Invalid choice"
            ;;
    esac

    # Next steps
    print_header "7. Next Steps"

    echo "Setup is complete! Here's what to do next:"
    echo ""
    echo "1. ⚙️  Configure Twilio Webhooks"
    echo "   • Go to: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox"
    echo "   • Set webhook to: https://your-domain.com/whatsapp"
    echo ""
    echo "2. 🧪 Test the Application"
    echo "   • Health check: curl http://localhost:5001/health"
    echo "   • Status check: curl http://localhost:5001/status"
    echo "   • Send WhatsApp message to test"
    echo ""
    echo "3. 🚀 Deploy to Production"
    echo "   • See DEPLOYMENT.md for detailed instructions"
    echo "   • Use Docker or cloud platform (Heroku, Railway, etc.)"
    echo ""
    echo "4. 🔒 Security"
    echo "   • Review SECURITY.md"
    echo "   • Rotate any exposed credentials"
    echo "   • Enable HTTPS in production"
    echo ""
    echo "5. 📊 Monitor"
    echo "   • Set up uptime monitoring (UptimeRobot, Pingdom)"
    echo "   • Configure log aggregation"
    echo "   • Set up automated backups"
    echo ""

    print_success "All done! 🎉"
    echo ""
}

# Run main function
main
