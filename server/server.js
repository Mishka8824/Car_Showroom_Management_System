const express = require('express');
const session = require('express-session');
const mysql = require('mysql2');
const cors = require('cors')
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;


// Replace the following with your MySQL database configuration
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'wassup8824',
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

db.query('CREATE DATABASE IF NOT EXISTS CarMS', (err) => {
    if (err) {
      console.error('Error creating database:', err);
      return;
    }
    else{
        console.log('Database created or already exists..')
    }
});

db.query('USE CarMS', (err) => {
    if (err) {
      console.error('Error using Database:', err);
      return;
    }
    else{
        console.log('Using CarMS database')
    }
});

db.query(`
      CREATE TABLE IF NOT EXISTS available_cars (
        VIN INT AUTO_INCREMENT PRIMARY KEY,
        BRAND VARCHAR(255) NOT NULL,
        MODEL VARCHAR(255) NOT NULL,
        YEAR INT NOT NULL,
        COLOR VARCHAR(50) NOT NULL,
        ENGINE_DISP INT NOT NULL,
        COST DECIMAL(18, 2) NOT NULL,
        CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating "available_cars" table:', err);
      }
      else{
        console.log('"available_cars" table is being used or already exists!')
      }
    });

    db.query(`
    CREATE TABLE IF NOT EXISTS Services (
      Service_ID INT AUTO_INCREMENT PRIMARY KEY,
      Type_of_service VARCHAR(255) NOT NULL,
      Cost_of_service DECIMAL(18, 2) NOT NULL,
      Date_of_service DATE NOT NULL,
      Car_ID INT,
      Created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (Car_ID) REFERENCES available_cars(VIN)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating "Services" table:', err);
    } else {
      console.log('"Services" table is being used or already exists!');
    }
  });

  db.query(`
    CREATE TABLE IF NOT EXISTS Spare_Parts (
      PID INT AUTO_INCREMENT PRIMARY KEY,
      Part_Name VARCHAR(255) NOT NULL,
      Part_Type VARCHAR(255) NOT NULL,
      Quantity_stocked INT NOT NULL,
      Cost_per_Unit DECIMAL(18,2) NOT NULL,
      Service_ID INT,
      FOREIGN KEY (Service_ID) REFERENCES Services(Service_ID)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating "Spare_Parts" table:', err);
    } else {
      console.log('"Spare_Parts" table is being used or already exists!');
    }
  });

  db.query(`
    CREATE TABLE IF NOT EXISTS my_cars (
        Car_ID INT PRIMARY KEY,
        BRAND VARCHAR(255) NOT NULL,
        MODEL VARCHAR(255) NOT NULL,
        YEAR INT NOT NULL,
        COLOR VARCHAR(50) NOT NULL,
        ENGINE_DISP INT NOT NULL,
        FOREIGN KEY (Car_ID) REFERENCES available_cars(VIN)
    )
`, (err) => {
    if (err) {
        console.error('Error creating "my_cars" table:', err);
    } else {
        console.log('"my_cars" table is being used or already exists!');
    }
});

db.query(`
    CREATE TABLE IF NOT EXISTS my_services (
        Service_Id INT AUTO_INCREMENT PRIMARY KEY,
        Car_Id INT,
        Service_Type VARCHAR(255) NOT NULL,
        Service_Date DATE NOT NULL,
        Service_Cost DECIMAL(18, 2) NOT NULL,
        FOREIGN KEY (Car_Id) REFERENCES my_cars(Car_Id) ON DELETE CASCADE
    )
`, (err) => {
    if (err) {
        console.error('Error creating "my_services" table:', err);
    } else {
        console.log('"my_services" table is being used or already exists!')
    }
});


// Middleware to parse request body
app.use(cors()); // Use cors middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
  })
);

// Middleware to check if the user is logged in as an admin
const isAdminLoggedIn = (req, res, next) => {
  if (req.session.loggedIn && req.session.userType === 'admin') {
    next();
  } else {
    res.redirect('/login.html');
  }
};

app.use(['/index.html', '/services.html', '/spare_parts.html'], isAdminLoggedIn);

// Serve HTML and JS files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint for user login
app.post('/login', (req, res) => {
  const { userType, password } = req.body;

  // Basic validation - you should use a more secure method
  if (userType === 'admin' && password === 'adminpassword') {
    req.session.loggedIn = true;
    req.session.userType = userType;
    res.redirect('/index.html');
  } else {
    res.status(401).send('Invalid credentials. Please try again.');
  }
});

// Endpoint to display all cars
app.get('/cars', (req, res) => {
  db.query('SELECT * FROM available_cars', (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ cars: results });
  });
});

// Endpoint to add a new car
app.post('/cars', (req, res) => {
  const { brand, model, year, color, engine_disp, cost } = req.body;
  const query = 'INSERT INTO available_cars (BRAND, MODEL, YEAR, COLOR, ENGINE_DISP, COST) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(query, [brand, model, year, color, engine_disp, cost], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ VIN: results.insertId });
  });
});
  

// Endpoint to update a car
app.put('/cars/:VIN', (req, res) => {
  const { brand, model, year, color, engine_disp, cost } = req.body;
  const VIN = req.params.VIN;
  const query = 'UPDATE available_cars SET BRAND=?, MODEL=?, YEAR=?, COLOR=?, ENGINE_DISP=?, COST=? WHERE VIN=?';
  db.query(query, [brand, model, year, color, engine_disp, cost, VIN], (err, results) => {
    if (err) {
      console.error('Error updating car:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.json({ changes: results.changedRows });
  });
});

  

// Endpoint to delete a car
app.delete('/cars/:VIN', (req, res) => {
  const VIN = req.params.VIN;
  const query = 'DELETE FROM available_cars WHERE VIN=?';
  db.query(query, [VIN], (err, results) => {
    if (err) {
      console.error('Error deleting car:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.json({ deleted: results.affectedRows });
  });
});

// Endpoint to display all services (Used INNER JOIN TO DISPLAY ALL FIELDS OF SERVICES AND CARS TABLES)
app.get('/services', (req, res) => {
  const query = `
    SELECT Services.Service_ID, Services.Type_of_service, Services.Cost_of_service, Services.Date_of_service,
           available_cars.VIN AS Car_ID, available_cars.BRAND, available_cars.MODEL, available_cars.YEAR
    FROM Services
    JOIN available_cars ON Services.Car_ID = available_cars.VIN;
  `;

  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    res.json({ services: results });
  });
});

// Endpoint to add a new service
app.post('/services', (req, res) => {
  const { type_of_service, cost_of_service, date_of_service, car_id } = req.body;
  const query = 'INSERT INTO Services (Type_of_service, Cost_of_service, Date_of_service, Car_ID) VALUES (?, ?, ?, ?)';
  db.query(query, [type_of_service, cost_of_service, date_of_service, car_id], (err, results) => {
      if (err) {
          res.status(500).json({ error: err.message });
          return;
      }
      res.json({ id: results.insertId });
  });
});

// Endpoint to update a service
app.put('/services/:Service_ID', (req, res) => {
  const { Type_of_service, Cost_of_service, Date_of_service, Car_ID } = req.body;
  const id = req.params.id;

  const query = `
    UPDATE Services
    SET Type_of_service=?, Cost_of_service=?, Date_of_service=?, Car_ID=?
    WHERE Service_ID=?;
  `;

  db.query(query, [Type_of_service, Cost_of_service, Date_of_service, Car_ID, id], (err, results) => {
    if (err) {
      console.error('Error updating service:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.json({ changes: results.changedRows });
  });
});

// Endpoint to delete a service
app.delete('/services/:id', (req, res) => {
  const id = req.params.id;

  const query = 'DELETE FROM Services WHERE Service_ID=?';

  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error deleting service:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.json({ deleted: results.affectedRows });
  });
});

// Endpoint to display all spare_parts with corresponding service name
app.get('/spare-parts', (req, res) => {
  const query = `
    SELECT Spare_Parts.PID, Spare_Parts.Part_Name, Spare_Parts.Part_Type, Spare_Parts.Quantity_stocked,
           Spare_Parts.Cost_per_Unit, Services.Type_of_service AS Service_Name
    FROM Spare_Parts
    LEFT JOIN Services ON Spare_Parts.Service_ID = Services.Service_ID;
  `;

  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ spareParts: results });
  });
});

// Add Spare Part
app.post('/spare-parts', (req, res) => {
  const { Part_Name, Part_Type, Quantity_stocked, Cost_per_Unit, Service_ID } = req.body;
  const query = 'INSERT INTO Spare_Parts (Part_Name, Part_Type, Quantity_stocked, Cost_per_Unit, Service_ID) VALUES (?, ?, ?, ?, ?)';
  db.query(query, [Part_Name, Part_Type, Quantity_stocked, Cost_per_Unit, Service_ID], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: results.insertId });
  });
});

// Delete Spare Part
app.delete('/spare-parts/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM Spare_Parts WHERE PID = ?';
  db.query(query, [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Spare part deleted successfully' });
  });
});

// Endpoint to handle car purchase
app.post('/purchase/:carId', (req, res) => {
  const carId = req.params.carId;

  // Fetch the car details from the available_cars table
  db.query('SELECT * FROM available_cars WHERE ID = ?', [carId], (fetchError, carDetails) => {
    if (fetchError) {
      res.status(500).json({ error: fetchError.message });
      return;
    }

    if (carDetails.length === 0) {
      res.status(404).json({ error: 'Car not found.' });
      return;
    }

    const purchasedCar = carDetails[0];

    // Insert the car into the my_cars table
    db.query('INSERT INTO my_cars SET ?', purchasedCar, (insertError) => {
      if (insertError) {
        res.status(500).json({ error: insertError.message });
        return;
      }

      // Delete the car from the available_cars table
      db.query('DELETE FROM available_cars WHERE ID = ?', [carId], (deleteError) => {
        if (deleteError) {
          res.status(500).json({ error: deleteError.message });
          return;
        }

        res.json({ success: true });
      });
    });
  });
});


// Endpoint to fetch user's cars
app.get('/my-cars', (req, res) => {
  db.query('SELECT * FROM my_cars', (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ myCars: results });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
