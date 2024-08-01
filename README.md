# Vehicle Fleet System & Supply System API

This is a NodeJS + express + Prisma ORM API. Working with SQL SERVER.

## Dependencies Installation
Is strongly recommended to use [Bun](https://bun.sh/) instead of npm. The bun binaries are included in the repository.
`cd` to the project root, and run `bun i` to install all dependencies.

## Database
This is the DB SCheme and relations (Job required to name the tables in spanish and this format: TB_Table_Name but in prisma I mapped them so the codebase is in english with camelCased properties):

Vehicle Fleet Control System Database:

![image](https://github.com/user-attachments/assets/8d7dbab0-5897-45ec-86b9-04d73569646b)


Supply System Database:

![image](https://github.com/user-attachments/assets/6041b02d-6445-43f5-98aa-6767d46f1911)


## Environment Variables
This system is related to the [Vehicle System](https://github.com/Ajuriaa/vehicle-fleet-system.git), you are required to put the VEHICLE_DATABASE_URL, RRHH_DATABASE_URL, SSL_CERT_PATH, and SSL_KEY_PATH in the .env file, a template is found in the root folder (.env.template).

## Development server

Run `bun run dev` for a dev server. Navigate to `http://localhost:5700/api/`. The application will automatically reload if you change any of the source files.

## Running linter

Run `bun run lint` to execute the linter, and fix fixable linting errors, via [Eslint for Typescript](https://typescript-eslint.io/)
