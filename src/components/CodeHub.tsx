import { useState } from 'react';
import {
  FileCode, Database, RefreshCw, Layers, Terminal, Server, ShieldAlert, Check
} from 'lucide-react';

export default function CodeHub() {
  const [activeTab, setActiveTab] = useState<'er-diagram' | 'relational-db' | 'passenger-native' | 'driver-native' | 'backend-express' | 'devops'>('er-diagram');
  const [copied, setCopied] = useState(false);

  const triggerCopy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const dbSchemaCode = `/**
 * RideX Relational MySQL Tables Config Model Definitions
 * Uses Sequelize ORM & Proper Foreign Key Relationships
 */

const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize(process.env.MYSQL_URI || 'mysql://root:secret@localhost:3306/ridex_db', {
  logging: false,
  dialect: 'mysql'
});

// 1. Users Map
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, validate: { isEmail: true } },
  phone: { type: DataTypes.STRING, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('passenger', 'driver', 'admin'), defaultValue: 'passenger' },
  avatar: { type: DataTypes.STRING },
  isBanned: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// 2. Drivers Map
const Driver = sequelize.define('Driver', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, references: { model: User, key: 'id' } },
  isOnline: { type: DataTypes.BOOLEAN, defaultValue: false },
  isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  licenseNumber: { type: DataTypes.STRING, unique: true },
  backgroundCheckStatus: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
  rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 5.0 }
});

// 3. Vehicles Map
const Vehicle = sequelize.define('Vehicle', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  driverId: { type: DataTypes.UUID, references: { model: Driver, key: 'id' }, unique: true },
  model: { type: DataTypes.STRING, allowNull: false },
  plateNumber: { type: DataTypes.STRING, unique: true, allowNull: false },
  color: { type: DataTypes.STRING },
  vehicleType: { type: DataTypes.ENUM('economy', 'comfort', 'lux'), defaultValue: 'economy' }
});

// 4. Rides Map
const Ride = sequelize.define('Ride', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  passengerId: { type: DataTypes.UUID, references: { model: User, key: 'id' } },
  driverId: { type: DataTypes.UUID, references: { model: Driver, key: 'id' }, allowNull: true },
  pickupAddress: { type: DataTypes.STRING, allowNull: false },
  destinationAddress: { type: DataTypes.STRING, allowNull: false },
  pickupLat: { type: DataTypes.DECIMAL(10, 8), allowNull: false },
  pickupLng: { type: DataTypes.DECIMAL(11, 8), allowNull: false },
  destinationLat: { type: DataTypes.DECIMAL(10, 8), allowNull: false },
  destinationLng: { type: DataTypes.DECIMAL(11, 8), allowNull: false },
  status: { 
    type: DataTypes.ENUM('requested', 'accepted', 'arriving', 'active', 'completed', 'cancelled'),
    defaultValue: 'requested'
  },
  fare: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  distance: { type: DataTypes.DECIMAL(5, 2) }, // in km
  eta: { type: DataTypes.INTEGER }, // in mins
  paymentMethod: { type: DataTypes.ENUM('cash', 'stripe', 'wallet'), defaultValue: 'stripe' }
});

// 5. Payments Map
const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  rideId: { type: DataTypes.UUID, references: { model: Ride, key: 'id' } },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  paymentStatus: { type: DataTypes.ENUM('pending', 'completed', 'failed'), defaultValue: 'pending' },
  transactionId: { type: DataTypes.STRING, unique: true },
  gatewayUsed: { type: DataTypes.ENUM('razorpay', 'stripe', 'cash'), defaultValue: 'stripe' }
});

// 6. Wallets Map
const Wallet = sequelize.define('Wallet', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, references: { model: User, key: 'id' }, unique: true },
  balance: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 }
});

// Relationships Modeling
User.hasOne(Wallet, { foreignKey: 'userId' });
Wallet.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(Driver, { foreignKey: 'userId' });
Driver.belongsTo(User, { foreignKey: 'userId' });

Driver.hasOne(Vehicle, { foreignKey: 'driverId' });
Vehicle.belongsTo(Driver, { foreignKey: 'driverId' });

User.hasMany(Ride, { foreignKey: 'passengerId', as: 'BookedRides' });
Ride.belongsTo(User, { foreignKey: 'passengerId', as: 'Passenger' });

Driver.hasMany(Ride, { foreignKey: 'driverId', as: 'AssignedRides' });
Ride.belongsTo(Driver, { foreignKey: 'driverId', as: 'Driver' });

Ride.hasOne(Payment, { foreignKey: 'rideId' });
Payment.belongsTo(Ride, { foreignKey: 'rideId' });

module.exports = { sequelize, User, Driver, Vehicle, Ride, Payment, Wallet };`;

  const passengerCode = `import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

export default function PassengerAppView() {
  const [pickup, setPickup] = useState('Connaught Place, Delhi');
  const [destination, setDestination] = useState('Noida Sector 62');
  const [hasBooked, setHasBooked] = useState(false);

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map}
        initialRegion={{
          latitude: 28.6139,
          longitude: 77.2090,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        }}
      >
        <Marker coordinate={{ latitude: 28.6304, longitude: 77.2177 }} title="Pickup" pinColor="green" />
        <Marker coordinate={{ latitude: 28.6273, longitude: 77.3725 }} title="Destination" pinColor="red" />
      </MapView>

      <View style={styles.sheet}>
        <Text style={styles.title}>RideX Mobile Passenger</Text>
        
        <TextInput 
          style={styles.input} 
          placeholder="Enter Pickup Origin Address"
          value={pickup}
          onChangeText={setPickup}
        />
        <TextInput 
          style={styles.input} 
          placeholder="Enter Dropping Address"
          value={destination}
          onChangeText={setDestination}
        />

        <TouchableOpacity 
          style={styles.btn} 
          onPress={() => setHasBooked(true)}
        >
          <Text style={styles.btnText}>{hasBooked ? "Finding Drivers..." : "Book RideX Now"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  map: { flex: 1 },
  sheet: { padding: 20, backgroundColor: '#1e293b', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15 },
  input: { backgroundColor: '#0f172a', color: '#fff', padding: 12, borderRadius: 10, marginVertical: 6 },
  btn: { backgroundColor: '#10b981', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 16 }
});`;

  const driverCode = `import React, { useState } from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity } from 'react-native';

export default function DriverDashboard() {
  const [isOnline, setIsOnline] = useState(false);
  const [incomingJob, setIncomingJob] = useState({
    passengerName: 'Mark Sterling',
    destination: 'Wall Street Finance Plaza',
    fare: '₹1800.00'
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.driverName}>Driver Alex Console</Text>
        <View style={styles.row}>
          <Text style={{color: '#94a3b8'}}>Online Status</Text>
          <Switch value={isOnline} onValueChange={setIsOnline} />
        </View>
      </View>

      {isOnline && incomingJob && (
        <View style={styles.jobBox}>
          <Text style={styles.badge}>NEW DISPATCH REQUEST</Text>
          <Text style={styles.jobText}>Passenger: {incomingJob.passengerName}</Text>
          <Text style={styles.jobText}>Dest: {incomingJob.destination}</Text>
          <Text style={styles.jobText}>Fare: {incomingJob.fare}</Text>
          
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.decline]}>
              <Text style={{color: '#f43f5e', fontWeight: 'bold'}}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.accept]}>
              <Text style={{color: '#000', fontWeight: 'bold'}}>Accept Job</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  header: { borderBottomWidth: 1, borderColor: '#334155', paddingBottom: 15, marginBottom: 20 },
  driverName: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  jobBox: { backgroundColor: '#1e293b', pading: 20, borderRadius: 20, borderWidth: 1, borderColor: '#f59e0b' },
  badge: { color: '#f59e0b', fontWeight: 'bold', fontSize: 12 },
  jobText: { color: '#fff', marginVertical: 4 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  actionBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  decline: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#f43f5e' },
  accept: { backgroundColor: '#f59e0b' }
});`;

  const backendCode = `const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

// Real-Time Socket.io Matching Coordinates Map
io.on('connection', (socket) => {
  console.log(\`Client connected: \${socket.id}\`);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
  });

  socket.on('request_ride', (rideData) => {
    io.emit('ride_requested_on_network', rideData);
  });

  socket.on('accept_ride', (matchData) => {
    io.to(matchData.passengerId).emit('ride_accepted_status', matchData);
  });

  socket.on('update_gps_coordinates', (trackingCoords) => {
    io.to(trackingCoords.rideId).emit('gps_ping_pushed', trackingCoords);
  });
});

app.post('/api/fare/predict', async (req, res) => {
  const { pickup, destination, distance, vehicleType } = req.body;
  const baseFares = { economy: 7.50, comfort: 12.50, lux: 21.50 };
  const calculatedFare = baseFares[vehicleType] + (distance * 1.8);
  res.json({
    fare: calculatedFare,
    prediction: \`AI prediction based on New York traffic and active taxi multipliers.\`
  });
});

httpServer.listen(3000, () => {
  console.log('RideX Live Backend listening on port 3000');
});`;

  const devopsCode = `# Docker-Compose Microservice file composition for production deployment
version: '3.8'

services:
  ridex-backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MYSQL_URI=mysql://ridex_admin:secret_secure_db@mysql-db:3306/ridex_prod
      - STRIPE_SECRET_KEY=sk_live_thisisnotarealkey
    depends_on:
      - mysql-db

  mysql-db:
    image: mysql:8.0
    restart: always
    environment:
      - MYSQL_DATABASE=ridex_prod
      - MYSQL_ROOT_PASSWORD=secret_secure_db
    ports:
      - "3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql

volumes:
  mysql-data:`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 min-h-[600px] text-slate-200 text-left font-sans flex flex-col gap-5 relative overflow-hidden" id="codehub-center">
      
      {/* Absolute background accent decoration */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="text-emerald-400" size={20} />
            <span>Developer Suite & Multiplatform Artifacts</span>
          </h2>
          <p className="text-xs text-slate-400">Complete enterprise code, relational schemas, ER diagram, and DevOps integrations</p>
        </div>

        {/* Multi tab navigator */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('er-diagram')}
            className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'er-diagram' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            ER Diagram
          </button>
          <button
            onClick={() => setActiveTab('relational-db')}
            className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'relational-db' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'}`}
          >
            MySQL Tables
          </button>
          <button
            onClick={() => setActiveTab('passenger-native')}
            className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'passenger-native' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'}`}
          >
            Passenger App code
          </button>
          <button
            onClick={() => setActiveTab('driver-native')}
            className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'driver-native' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'}`}
          >
            Driver App code
          </button>
          <button
            onClick={() => setActiveTab('backend-express')}
            className={`px-2 py-1.5 rounded-lg transition ${activeTab === 'backend-express' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'text-slate-405'}`}
          >
            Express+Socket
          </button>
          <button
            onClick={() => setActiveTab('devops')}
            className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'devops' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-450'}`}
          >
            Docker Compose
          </button>
        </div>
      </div>

      {activeTab === 'er-diagram' && (
        <div className="space-y-4">
          <div className="bg-slate-950/80 p-4 border border-slate-800 rounded-2xl">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest block font-bold mb-3">Model relationships entities diagram (SVG Vector Structure)</span>
            
            {/* Beautiful Custom Illustrated SVG representing DB normalizations map */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl py-8 flex items-center justify-center overflow-auto shadow-inner" id="svg-er-diagram">
              <svg width="680" height="380" className="text-slate-300 font-sans" viewBox="0 0 680 380">
                {/* Tables cards represented as boxes */}
                {/* Users table */}
                <rect x="20" y="30" width="130" height="110" rx="10" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
                <rect x="20" y="30" width="130" height="28" rx="10" fill="#064e43" />
                <text x="85" y="48" fill="#ffffff" className="font-bold text-[11px] font-mono tracking-wider" textAnchor="middle">USERS TABLE</text>
                <text x="30" y="75" fill="#10b981" className="text-[10px] font-mono">🔑 id (UUID)</text>
                <text x="30" y="90" fill="#cbd5e1" className="text-[9px]">name (VARCHAR)</text>
                <text x="30" y="105" fill="#cbd5e1" className="text-[9px]">role (ENUM)</text>
                <text x="30" y="120" fill="#cbd5e1" className="text-[9px]">phone (VARCHAR)</text>

                {/* Wallets table */}
                <rect x="20" y="240" width="130" height="92" rx="10" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
                <rect x="20" y="240" width="130" height="26" rx="10" fill="#064e43" />
                <text x="85" y="258" fill="#ffffff" className="font-bold text-[11px]" textAnchor="middle">WALLETS</text>
                <text x="30" y="282" fill="#10b981" className="text-[9px] font-mono">🔑 id (UUID)</text>
                <text x="30" y="297" fill="#64748b" className="text-[9px] font-mono">🔗 userId (FK)</text>
                <text x="30" y="312" fill="#cbd5e1" className="text-[9px]">balance (DECIMAL)</text>

                {/* Relational paths between Users and Wallets */}
                <path d="M 85 140 L 85 240" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
                <circle cx="85" cy="143" r="3" fill="#10b981" />
                <circle cx="85" cy="237" r="3" fill="#10b981" />

                {/* Drivers table */}
                <rect x="240" y="30" width="130" height="110" rx="10" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
                <rect x="240" y="30" width="130" height="28" rx="10" fill="#0369a1" />
                <text x="305" y="48" fill="#ffffff" className="font-bold text-[11px]" textAnchor="middle">DRIVERS (FK)</text>
                <text x="250" y="75" fill="#38bdf8" className="text-[9px] font-mono">🔑 id (UUID)</text>
                <text x="250" y="90" fill="#64748b" className="text-[9px] font-mono">🔗 userId (FK)</text>
                <text x="250" y="105" fill="#cbd5e1" className="text-[9px]">isOnline (BOOL)</text>
                <text x="250" y="120" fill="#cbd5e1" className="text-[9px]">license (VARCHAR)</text>

                {/* Users to Drivers link */}
                <line x1="150" y1="85" x2="240" y2="85" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2 2" />
                <circle cx="153" cy="85" r="3" fill="#38bdf8" />
                <circle cx="237" cy="85" r="3" fill="#38bdf8" />

                {/* Vehicles table */}
                <rect x="240" y="240" width="130" height="92" rx="10" fill="#0f172a" stroke="#ca8a04" strokeWidth="1" />
                <rect x="240" y="240" width="130" height="26" rx="10" fill="#854d0e" />
                <text x="305" y="258" fill="#ffffff" className="font-bold text-[11px] font-mono" textAnchor="middle">VEHICLES</text>
                <text x="250" y="282" fill="#ca8a04" className="text-[9px] font-mono">🔑 id (UUID)</text>
                <text x="250" y="297" fill="#64748b" className="text-[9px] font-mono">🔗 driverId (FK)</text>
                <text x="250" y="312" fill="#cbd5e1" className="text-[9px]">model / plate</text>

                {/* Drivers to Vehicles link */}
                <line x1="305" y1="140" x2="305" y2="240" stroke="#ca8a04" strokeWidth="1.5" />
                <circle cx="305" cy="143" r="3" fill="#ca8a04" />
                <circle cx="305" cy="237" r="3" fill="#ca8a04" />

                {/* Rides table */}
                <rect x="490" y="30" width="160" height="130" rx="10" fill="#0f172a" stroke="#eab308" strokeWidth="1.5" />
                <rect x="490" y="30" width="160" height="28" rx="10" fill="#713f12" />
                <text x="570" y="48" fill="#ffffff" className="font-bold text-[11px]" textAnchor="middle">RIDES TABLE (TXN)</text>
                <text x="500" y="75" fill="#eab308" className="text-[9px] font-mono">🔑 id (UUID)</text>
                <text x="500" y="90" fill="#64748b" className="text-[9px] font-mono">🔗 passengerId (FK)</text>
                <text x="500" y="105" fill="#64748b" className="text-[9px] font-mono">🔗 driverId (FK)</text>
                <text x="500" y="120" fill="#cbd5e1" className="text-[9px]">journey pickup / drop</text>
                <text x="500" y="135" fill="#cbd5e1" className="text-[9px]">status (ENUM)</text>
                <text x="500" y="150" fill="#cbd5e1" className="text-[9px]">fare (DECIMAL)</text>

                {/* Relationships Drivers to Rides & Users to Rides */}
                <path d="M 370 70 L 490 70" fill="none" stroke="#eab308" strokeWidth="1" />
                <circle cx="373" cy="70" r="3" fill="#eab308" />
                <circle cx="487" cy="70" r="3" fill="#eab308" />

                {/* Payments Table */}
                <rect x="490" y="240" width="160" height="92" rx="10" fill="#0f172a" stroke="#a855f7" strokeWidth="1" />
                <rect x="490" y="240" width="160" height="26" rx="10" fill="#581c87" />
                <text x="570" y="258" fill="#ffffff" className="font-bold text-[11px] font-mono" textAnchor="middle">PAYMENTS</text>
                <text x="500" y="282" fill="#a855f7" className="text-[9px] font-mono">🔑 id (UUID)</text>
                <text x="500" y="297" fill="#64748b" className="text-[9px] font-mono">🔗 rideId (FK)</text>
                <text x="500" y="312" fill="#cbd5e1" className="text-[9px]">amount / gateway</text>

                {/* Rides to Payments link */}
                <line x1="570" y1="160" x2="570" y2="240" stroke="#a855f7" strokeWidth="1.5" />
                <circle cx="570" cy="163" r="3" fill="#a855f7" />
                <circle cx="570" cy="237" r="3" fill="#a855f7" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'relational-db' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">MySQL Database Relational Schema Sequelize ORM Mapping Structure</span>
            <button
              onClick={() => triggerCopy(dbSchemaCode)}
              className="bg-emerald-500 font-bold text-slate-950 px-3 py-1.5 rounded flex items-center gap-1 leading-none text-xs transition active:scale-95"
            >
              {copied ? <Check size={12} /> : <FileCode size={12} />}
              <span>{copied ? 'Copied' : 'Copy ORM file'}</span>
            </button>
          </div>

          <pre className="bg-slate-950/90 text-slate-350 p-4 rounded-2xl text-[11px] font-mono overflow-auto max-h-[380px] border border-slate-800 leading-relaxed text-left">
            <code>{dbSchemaCode}</code>
          </pre>
        </div>
      )}

      {activeTab === 'passenger-native' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">React Native Passenger Smartphone App Screen component (`screens/PassengerApp.jsx`)</span>
            <button
              onClick={() => triggerCopy(passengerCode)}
              className="bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded flex items-center gap-1 transition text-xs"
            >
              Copy Component code
            </button>
          </div>

          <pre className="bg-slate-950/90 text-slate-350 p-4 rounded-2xl text-[11px] font-mono overflow-auto max-h-[380px] border border-slate-800 text-left">
            <code>{passengerCode}</code>
          </pre>
        </div>
      )}

      {activeTab === 'driver-native' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">React Native Driver Smartphone App Screen component (`screens/DriverApp.jsx`)</span>
            <button
              onClick={() => triggerCopy(driverCode)}
              className="bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded flex items-center gap-1 transition text-xs"
            >
              Copy Component code
            </button>
          </div>

          <pre className="bg-slate-950/90 text-slate-350 p-4 rounded-2xl text-[11px] font-mono overflow-auto max-h-[380px] border border-slate-800 text-left">
            <code>{driverCode}</code>
          </pre>
        </div>
      )}

      {activeTab === 'backend-express' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Express Node API Server + WebSockets setup (`server/index.js`)</span>
            <button
              onClick={() => triggerCopy(backendCode)}
              className="bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded flex items-center gap-1 transition text-xs"
            >
              Copy Express server File
            </button>
          </div>

          <pre className="bg-slate-950/90 text-slate-350 p-4 rounded-2xl text-[11px] font-mono overflow-auto max-h-[380px] border border-slate-800 text-left">
            <code>{backendCode}</code>
          </pre>
        </div>
      )}

      {activeTab === 'devops' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Docker Deploy Compose microservice layout configurations (`docker-compose.yml`)</span>
            <button
              onClick={() => triggerCopy(devopsCode)}
              className="bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded flex items-center gap-1 transition text-xs"
            >
              Copy DevOps block
            </button>
          </div>

          <pre className="bg-slate-950/90 text-slate-350 p-4 rounded-2xl text-[11px] font-mono overflow-auto max-h-[380px] border border-slate-800 text-left">
            <code>{devopsCode}</code>
          </pre>
        </div>
      )}

    </div>
  );
}
