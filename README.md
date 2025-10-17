<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

## Cloning the Project

To clone this repository to your local machine, follow these steps:
Open cmd and type this command.

```bash
$ git clone https://github.com/dcodinglabs/solar-panel-web.git
```

## Backend Installation

Head to the src directory in the project and install the necessary packages using npm:

```bash
$ cd src
$ npm install
```

## Create Environment Variables

In your project directory, create a new file named .env .
Add the following content to set up your database connection and JWT secret:

```bash
$ DATABASE_URL="postgresql://Username:Password@localhost:5432/DatabaseName"

$ JWT_SECRET = 'secretKey'
$ JWT_EXPIRES_IN = 'Expiration time of JWT Token(for example  100000)'

$ EMAIL='example@email.com'
$ APP_PASSWORD='app password generated from gmail'
$ DESTINATION_EMAIL='destination@email.com'

$ GCS_BUCKET_NAME= 'Add the bucket name of google cloud storage'
$ GCS_KEYFILE_PATH= 'Generate a key from google cloud storage and add the path to it such as ./name-of-path.json'
$ GCS_PROJECT_ID= 'Project id for the google cloud storage'

# Optional: Skip email notifications during development (set to 'true' to skip)
$ SKIP_EMAIL_NOTIFICATIONS= 'true'
```

## Generate Migrations and Database

Run the following command to generate migrations and set up your database using Prisma:

```bash
$ npx prisma migrate dev
```

## User Seed

After running the prisma migration command , a user will be auto generated inside the User Table.
In order to login ,you can use this user at the login route

```bash
$ username : admin,
$ password : password
```

## Running Backend

Now your NestJS API is set up and ready to run!
You can start your application using the appropriate command for your environment

```bash
# development
$ npm start
```

## Frontend Installation

Head to the src directory in FE and install the necessary packages using npm:

```bash
$ cd src/FE/src
$ npm install
```

## Running Frontend

Now your React Application is set up and ready to run!
You can start your application using the appropriate command for your environment

```bash
# development
$ npm start
```

## Routes

Once both the Backend and Frontend are running , you can use the application normally . Below is a list of routes of the application

```bash
# Routes
$ localhost:8080/api/auth/login
```

// TO DO: migration documentation should be enhanced

localy:
docker buildx build --platform linux/arm64 -t solar-panel-web:local --load .
docker run -p 8080:8080 solar-panel-web:local

prod:
docker buildx build --platform linux/amd64 -t drospect-dev/solar-panel-web:latest --load .
docker push gcr.io/drospect-dev/solar-panel-web:latest
docker build -t gcr.io/drospect-dev/solar-panel-web:latest --push .

latest for pushing to gke be
docker buildx build --platform linux/amd64 -t gcr.io/drospect-dev/solar-panel-web-be:latest --push .
docker buildx build --platform linux/amd64 -t gcr.io/non-prod-environments/solar-panel-web-be:latest --push .
docker buildx build --platform linux/amd64 -t gcr.io/solar-panel-detection-1/solar-panel-web-be:latest --push .

for frontend
docker buildx build --platform linux/amd64 -t gcr.io/drospect-dev/solar-panel-web-fe:latest --push .
docker buildx build --platform linux/amd64 -t gcr.io/non-prod-environments/solar-panel-web-fe:latest --push .
docker buildx build --platform linux/amd64 -t gcr.io/solar-panel-detection-1/solar-panel-web-fe:latest --push .
