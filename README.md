To run this project:

1. **Install dependencies**
```shell script
npm install
```


2. **Set up environment variables**
    - Copy `.env.example` to `.env`
    - Fill in your database settings and session secret

3. **Create the database**
    - Import or execute `schema.sql` in your MySQL server
    - Make sure the database name in `.env` matches what you created

4. **Start the app**
    - For production-style start:
```shell script
npm start
```

- For development with auto-reload:
```shell script
npm run dev
```


5. **Open the app**
    - The server should run on the port from `.env`
    - By default, that’s `http://localhost:3000`

If you want, I can also help you figure out the **exact MySQL setup** or check whether the project needs any extra steps before starting.