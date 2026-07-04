// src/utils/validationSchemas.ts
import * as Yup from 'yup';

// Personal Information Schema
export const driverPersonalInfoSchema = Yup.object().shape({
  fullName: Yup.string().required('Full Name is required'),
  mobileNumber: Yup.string()
    .matches(/^\d{10}$/, 'Mobile number must be exactly 10 digits')
    .required('Mobile Number is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[a-z]/, 'Password must contain a lowercase letter')
    .matches(/[A-Z]/, 'Password must contain an uppercase letter')
    .matches(/\d/, 'Password must contain a number')
    .matches(/[@$!%*?&#]/, 'Password must contain a special character')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Confirm Password is required'),
  gender: Yup.string().oneOf(['Male', 'Female', 'Other']).required('Gender required'),
  dateOfBirth: Yup.date()
    .max(new Date(Date.now() - 567648000000), 'You must be at least 18 years old') // 18 years in ms
    .required('Date of Birth required'),
  address: Yup.string().required('Residential Address required'),
  city: Yup.string().required('City required'),
  state: Yup.string().required('State required'),
  pinCode: Yup.string()
    .matches(/^\d{6}$/, 'PIN code must be exactly 6 digits')
    .required('PIN Code required'),
});

// Vehicle Information Schema
export const vehicleInfoSchema = Yup.object().shape({
  vehicleType: Yup.string()
    .oneOf(['Bike', 'Auto', 'Car', 'SUV', 'Mini Van'])
    .required('Vehicle Type required'),
  brand: Yup.string().required('Vehicle Brand required'),
  model: Yup.string().required('Vehicle Model required'),
  color: Yup.string().required('Vehicle Color required'),
  manufacturingYear: Yup.number()
    .min(1990, 'Year must be reasonable')
    .max(new Date().getFullYear(), 'Year cannot be in the future')
    .required('Manufacturing Year required'),
  registrationNumber: Yup.string().required('Registration Number required'),
  seatingCapacity: Yup.number().min(1).required('Seating Capacity required'),
});

// Document Upload Schema (ensures each required document is provided)
export const documentUploadSchema = Yup.object().shape({
  profilePhoto: Yup.mixed().required('Profile Photo is required'),
  aadhaarFront: Yup.mixed().required('Aadhaar Front is required'),
  aadhaarBack: Yup.mixed().required('Aadhaar Back is required'),
  drivingLicenseFront: Yup.mixed().required('Driving License Front is required'),
  drivingLicenseBack: Yup.mixed().required('Driving License Back is required'),
  vehicleRC: Yup.mixed().required('Vehicle RC is required'),
  vehicleInsurance: Yup.mixed().required('Vehicle Insurance is required'),
  vehiclePUC: Yup.mixed().required('Vehicle PUC is required'),
  selfieVerification: Yup.mixed().required('Selfie Verification is required'),
});
