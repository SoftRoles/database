- [@SoftRoles : database](#softroles--database)
  - [Dependecies](#dependecies)
    - [3rd party](#3rd-party)
  - [Usage](#usage)
  - [Registers](#registers)
  - [API](#api)
    - [v1](#v1)
  - [Credits](#credits)
  - [License](#license)

# @SoftRoles : database 

Database REST api service

## Dependecies

### 3rd party
- Running *mongodb* service

## Usage

`$ node index.js`

## Registers

When the service is started it registers following variables to user environment.
- *SOFTROLES_SERVICE_DATABASE_PORT*

## API

### v1

| Method | Endpoint                         | Description                      | Notes                                                                                                                                                                                                        |
| :----- | :------------------------------- | :------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | *__/database/api__*              | List all databases               | Requires *req.user* as *{username: 'admin'}*                                                                                                                                                                 |
| GET    | *__/database/api/:db__*          | List database (*db*) collections | Requires *req.user* as *{username: 'admin'}*                                                                                                                                                                 |
| GET    | *__/database/api/:db/:col__*     | List collection (*col*) items    | Query by *req.query* and *req.user.username*                                                                                                                                                                 |
| POST   | *__/database/api/:db/:col__*     | Insert item into collection      | Item object parsed from *req.body* JSON object. <br> *owners* and *users* automatically assigned from *req.user* (default *{username:'admin'}*) <br> Besides you can add to *req.body* for additional users. |
| GET    | *__/database/api/:db/:col/:id__* | Get item with *id*               | User checked                                                                                                                                                                                                 |
| PUT    | *__/database/api/:db/:col/:id__* | Update item with *id*            | Ownership checked                                                                                                                                                                                            |
| DELETE | *__/database/api/:db/:col/:id__* | Delete item with *id*            | Ownership checked                                                                                                                                                                                            |

## Credits

  - [SoftRoles](http://github.com/softroles) as organization
  - [Hüseyin Yiğit](http://github.com/yigithsyn) as main contributor

## License

[The MIT License](http://opensource.org/licenses/MIT)