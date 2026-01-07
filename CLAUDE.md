# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Baileys is a TypeScript library for interacting with WhatsApp Web API via WebSocket. It implements the WhatsApp multi-device protocol using the Signal Protocol (libsignal) and Noise Protocol for end-to-end encryption.

## Common Commands

```bash
# Install dependencies
bun install

# Build the library
bun run build

# Run the example bot
bun run example

# Run with pairing code (instead of QR)
bun run example --use-pairing-code

# Run tests
bun test

# Run e2e tests
bun run test:e2e

# Type check
bun run typecheck

# Lint and format (using Biome)
bun run lint:fix

# Format only
bun run format

# Lint only
bun run lint

# Check all (lint + format)
bun run check

# Generate protobuf types
bun run gen:protobuf

# Build documentation
bun run build:docs
```

## Architecture

### Socket Layer Hierarchy (Layered Composition Pattern)

The socket is built through layered composition, each layer adding functionality:

```
makeWASocket (src/Socket/index.ts)
    └── makeCommunitiesSocket (communities.ts)
        └── makeBusinessSocket (business.ts)
            └── makeGroupsSocket (groups.ts)
                └── makeChatsSocket (chats.ts)
                    └── makeMessagesRecvSocket (messages-recv.ts)
                        └── makeMessagesSocket (messages-send.ts)
                            └── makeNewsletterSocket (newsletter.ts)
                                └── makeMexSocket (mex.ts)
                                    └── makeSocket (socket.ts) - Base WebSocket connection
```

Each layer calls the layer below it and extends it with additional methods. The base `makeSocket` handles:
- WebSocket connection management
- Noise Protocol handshake
- Authentication (QR code / pairing code)
- Event emission via EventEmitter pattern

### Key Directories

- **src/Socket/**: Socket layers implementing WhatsApp functionality
- **src/Types/**: TypeScript type definitions for events, messages, auth, etc.
- **src/Utils/**: Utility functions (crypto, message encoding, auth state, etc.)
- **src/WABinary/**: Binary XML encoding/decoding for WhatsApp's wire protocol
- **src/WAM/**: WhatsApp Analytics/Metrics encoding
- **src/WAUSync/**: User sync protocols (contacts, devices, status)
- **src/Signal/**: Signal Protocol implementation for E2E encryption
- **WAProto/**: Generated protobuf definitions from WAProto.proto

### Entry Point

`src/index.ts` exports:
- `makeWASocket` (default export) - Main socket factory
- All types, utilities, and protobuf definitions

### Event System

Baileys uses `sock.ev` EventEmitter for all events. Key events:
- `connection.update` - Connection state changes
- `creds.update` - Credential updates (must save for session persistence)
- `messages.upsert` - New messages received
- `messages.update` - Message updates (reactions, read receipts)
- `messaging.history-set` - History sync data

### Authentication

- Uses `useMultiFileAuthState()` for file-based session storage
- Auth state includes Signal protocol keys that MUST be persisted
- Keys update on every message send/receive via `creds.update` event

### Protobuf

WhatsApp message types are defined in `WAProto/WAProto.proto`. After modifying:
```bash
bun run gen:protobuf
```
This generates `WAProto/index.js` and `WAProto/index.d.ts`.

### WhatsApp IDs (JIDs)

- Personal: `[country][number]@s.whatsapp.net` (e.g., `19999999999@s.whatsapp.net`)
- Groups: `[id]@g.us` (e.g., `123456789-123345@g.us`)
- Broadcast: `[timestamp]@broadcast`
- Status/Stories: `status@broadcast`
