-- IPOTECA PLUS SRL - Database Schema
-- Run this file to initialize the database

CREATE DATABASE IF NOT EXISTS ipoteca_plus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ipoteca_plus;

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- Users table (simple front-end accounts)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(150),
    photo_url VARCHAR(300),
    bio TEXT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('apartament','casa','teren','comercial','birou') NOT NULL DEFAULT 'apartament',
    transaction ENUM('vanzare','inchiriere') NOT NULL DEFAULT 'vanzare',
    price DECIMAL(15,2) NOT NULL,
    currency ENUM('EUR','RON','USD') DEFAULT 'EUR',
    surface_m2 DECIMAL(10,2),
    rooms INT,
    bathrooms INT,
    floor INT,
    total_floors INT,
    year_built YEAR,
    address VARCHAR(300),
    city VARCHAR(100),
    zone VARCHAR(100),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    agent_id INT,
    is_featured TINYINT(1) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    views INT DEFAULT 0,
    image_url VARCHAR(300),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
    );

-- Property images table
CREATE TABLE IF NOT EXISTS property_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    image_url VARCHAR(300) NOT NULL,
    is_main TINYINT(1) DEFAULT 0,
    sort_order INT DEFAULT 0,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    );

-- Property features table
CREATE TABLE IF NOT EXISTS property_features (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    feature VARCHAR(150) NOT NULL,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    );

-- Contact inquiries table
CREATE TABLE IF NOT EXISTS inquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(150),
    message TEXT,
    status ENUM('new','read','responded') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
    );

-- --------------------------------------------------------
-- Demo data
-- --------------------------------------------------------

INSERT INTO admins (username, password_hash, full_name, email) VALUES
    ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 'admin@ipotecaplus.md');
-- Default password: "password" (bcrypt hash above)

INSERT INTO users (full_name, email, password_hash, phone) VALUES
    ('Client Demo', 'client@ipotecaplus.md', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NULL);
-- Default password: "password" (same bcrypt hash as admin)
INSERT INTO agents (full_name, phone, email, bio, is_active) VALUES
('Ion Cebotari', '+373 69 123 456', 'ion.cebotari@ipotecaplus.md', 'Agent cu peste 10 ani experiență pe piața imobiliară din Chișinău.', 1),
('Natalia Rusu', '+373 68 234 567', 'natalia.rusu@ipotecaplus.md', 'Specialist în spații comerciale și proprietăți premium.', 1),
('Andrei Moraru', '+373 79 345 678', 'andrei.moraru@ipotecaplus.md', 'Consultant pentru case, vile și terenuri.', 1);

INSERT INTO properties (
    title,
    description,
    type,
    transaction,
    price,
    currency,
    surface_m2,
    rooms,
    bathrooms,
    floor,
    total_floors,
    year_built,
    address,
    city,
    zone,
    agent_id,
    is_featured,
    is_active
) VALUES

(
'Apartament modern 3 camere - Botanica',
'Apartament luminos cu reparație euro, mobilat complet, aproape de parc și centre comerciale.',
'apartament',
'vanzare',
145000,
'EUR',
87.00,
3,
2,
6,
10,
2021,
'Bd. Dacia 45',
'Chișinău',
'Botanica',
1,
1,
1
),

(
'Vilă cu piscină - Durlești',
'Vilă premium cu piscină, terasă, garaj și curte amenajată.',
'casa',
'vanzare',
395000,
'EUR',
310.00,
6,
4,
NULL,
NULL,
2019,
'Str. Cartușa 12',
'Durlești',
'Centru',
2,
1,
1
),

(
'Apartament 2 camere - Centru',
'Apartament renovat complet în centrul orașului, ideal pentru investiție.',
'apartament',
'vanzare',
98000,
'EUR',
58.00,
2,
1,
4,
9,
1988,
'Str. Alexandru cel Bun 89',
'Chișinău',
'Centru',
1,
1,
1
),

(
'Teren pentru construcții - Stăuceni',
'Teren intravilan cu toate comunicațiile în apropiere.',
'teren',
'vanzare',
65000,
'EUR',
600.00,
NULL,
NULL,
NULL,
NULL,
NULL,
'Str. Unirii 7',
'Stăuceni',
'Centru',
3,
0,
1
),

(
'Spațiu comercial - Centru',
'Spațiu comercial cu vitrine panoramice și trafic intens.',
'comercial',
'inchiriere',
3200,
'EUR',
130.00,
NULL,
2,
1,
7,
2015,
'Bd. Ștefan cel Mare 65',
'Chișinău',
'Centru',
2,
1,
1
),

(
'Garsonieră - Rîșcani',
'Garsonieră mobilată și utilată complet, aproape de transport public.',
'apartament',
'inchiriere',
450,
'EUR',
35.00,
1,
1,
5,
9,
1987,
'Str. Miron Costin 21',
'Chișinău',
'Rîșcani',
1,
0,
1
),

(
'Casă individuală - Buiucani',
'Casă modernă cu 4 dormitoare, garaj și grădină.',
'casa',
'vanzare',
265000,
'EUR',
185.00,
5,
3,
NULL,
NULL,
2017,
'Str. Alba Iulia 123',
'Chișinău',
'Buiucani',
3,
0,
1
),

(
'Birou Open Space - Centru',
'Spațiu de birouri modern cu recepție și parcare.',
'birou',
'inchiriere',
2500,
'EUR',
210.00,
NULL,
3,
8,
12,
2020,
'Bd. Grigore Vieru 15',
'Chișinău',
'Centru',
2,
0,
1
);

INSERT INTO property_features (property_id, feature) VALUES
(1,'Parcare subterană'),
(1,'Lift'),
(1,'Balcon'),
(1,'Încălzire autonomă'),

(2,'Piscină'),
(2,'Grădină'),
(2,'Garaj'),
(2,'Sistem de alarmă'),

(3,'Balcon'),
(3,'Aer condiționat'),
(3,'Încălzire autonomă'),

(5,'Vitrine panoramice'),
(5,'Aer condiționat'),
(5,'Pază'),

(6,'Mobilat'),
(6,'Utilat'),
(6,'Lift'),

(7,'Garaj'),
(7,'Grădină'),
(7,'Încălzire autonomă'),

(8,'Open Space'),
(8,'Recepție'),
(8,'Parcare');

INSERT INTO property_images (property_id, image_url, is_main, sort_order) VALUES
    (1, '/images/apartament-botanica.jpg', 1, 0),
    (2, '/images/vila-durlesti.jpg', 1, 0),
    (3, '/images/apartament-centru.jpg', 1, 0),
    (4, '/images/teren-stauceni.jpg', 1, 0),
    (5, '/images/spatiu-comercial-centru.jpg', 1, 0),
    (6, '/images/garsoniera-riscani.jpg', 1, 0),
    (7, '/images/casa-buiucani.jpg', 1, 0),
    (8, '/images/birou-centru.jpg', 1, 0);

INSERT INTO inquiries (
    property_id,
    full_name,
    phone,
    email,
    message,
    status
) VALUES

(
1,
'Victor Munteanu',
'+373 69 777 111',
'victor.munteanu@gmail.com',
'Sunt interesat de apartament. Când poate fi programată o vizionare?',
'new'
),

(
2,
'Maria Grosu',
'+373 68 888 222',
'maria.grosu@yahoo.com',
'Ce acte sunt necesare pentru achiziție?',
'read'
),

(
5,
'Sergiu Lupu',
'+373 79 999 333',
'sergiu@firma.md',
'Dorim să vedem spațiul comercial pentru o posibilă închiriere.',
'new'
);
    