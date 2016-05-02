CREATE KEYSPACE shadybusiness WITH REPLICATION = { 'class' : 'SimpleStrategy', 'replication_factor' : 1 };
USE shadybusiness;

DROP TABLE IF EXISTS Place;
DROP TABLE IF EXISTS Category;

create table Category (
  id text,
  name text,
  icon text,  
  PRIMARY KEY (id)
);

create table Place (
  id text,
  name text,
  description text,
  url text,
  categories list<text>,
  tags list<text>,
  locationLatitude double,
  locationLongitude double,
  locationAccurate boolean,
  locationStreetAddress text,
  locationCrossStreet text,
  locationCity text,
  locationState text,
  locationPostalCode text,
  locationCountry text,
  priceLevel text,
  priceMessage text,
  PRIMARY KEY (id)
);
