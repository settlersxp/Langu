# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

## Upgrade dependencies

```sh
npm update
npm install
```

## Prisma

To set up the project:

```sh
npx prisma init # Initialize Prisma
npm run prisma:generate # Generate client
npm run prisma:migrate # Create initial migration
```

You can preview the production build with `npm run preview`.

# Langu

The application is formed of "decks" and "sections". The user is able to create, edit and delete decks and sections.

## Deck

A deck is a list of sections that can be added and removed dynamically.
The sections will be able to be dragged and dropped to reorder them.
The deck features a "play" button for each section and a "play all" button which goes through the sections in order.

## Section

A section is a component that can be added and removed dynamically.
The decks can be managed in the "Decks" page.

## Deck Management

The decks can be managed in the "Decks" page.
The decks can be added, removed, and renamed.
The decks can be dragged and dropped to reorder them.

# Database

The Decks and Sections are stored in the sqlite database.

## Deck

The deck section has the following fields:

- The name of the deck
- The description of the deck (optional)
- The number of times the deck has been played

## Section

The section component has the following fields:

- The text in the foreign language
- The text in english
- The path to the mp3 file for the foreign language text
- The deck id
- The current position in the deck

Google language API for Chirp3 text to speech is used to generate an audio for the foreign language text.
Once an mp3 file is generated, it is stored in a folder and it's path is stored in the database to be reused later.
On device text to speech is used to generate an audio for the english text.
The foreign language text is played, then, a period of time equal with 2x the length of the foreign language text is waited in order to allow the user to repeat the foreign language text.
Then, the text is english is played in order to allow the user to remember the meaning.
