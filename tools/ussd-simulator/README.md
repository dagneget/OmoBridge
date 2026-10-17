# USSD Simulator

This directory contains a standalone test interface for simulating USSD sessions with the OmoBridge backend.

## Purpose
- It is a developer and testing tool that sends HTTP POST requests formatted like telecom USSD gateway callbacks to `/api/v1/integrations/ussd`.
- **Note**: This is not part of the public or enterprise web portal; it simulates feature phone interactions (*990#) for testing rural producer workflows without physical SIMs.

## Usage
- Open `index.html` (or run a local static server) and configure the backend endpoint URL.
- Test menu navigation, session timeouts, and multilingual prompts (Amharic / English / Hamer).
