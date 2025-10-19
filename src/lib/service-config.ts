// src/lib/service-config.ts
export interface Service {
  id: string;
  name: string;
  domain: string;
  description: string;
  brand: {
    primaryColor: string;
    secondaryColor: string;
    logo: string;
    favicon: string;
  };
  businessType: string;
  defaultEmailSignature: string;
  serviceTypes: string[];
  pricingStructure: "hourly" | "project" | "seasonal" | "monthly";
  communicationStyle: string;
}

export const serviceConfig: Record<string, Service> = {
  portfolio: {
    id: "portfolio",
    name: "Evangelo Sommer Development",
    domain: "evangelosommer.com",
    description: "Web Development & Digital Solutions",
    brand: {
      primaryColor: "#D4AF37",
      secondaryColor: "#64748b",
      logo: "/logos/evangelo-logo.png",
      favicon: "/favicons/evangelo.ico",
    },
    businessType: "Web Development",
    defaultEmailSignature:
      "Best regards,\nEvangelo Sommer\nWeb Developer\nevangelosommer.com",
    serviceTypes: [
      "Web Development",
      "E-commerce",
      "Digital Strategy",
      "Consulting",
    ],
    pricingStructure: "project",
    communicationStyle: "Professional and technical",
  },
  woodgreen: {
    id: "woodgreen",
    name: "WOODGREEN LANDSCAPING",
    domain: "woodgreenlandscaping.com",
    description: "Professional Landscaping Services",
    brand: {
      primaryColor: "#059669",
      secondaryColor: "#6b7280",
      logo: "/logos/woodgreen-logo.png",
      favicon: "/favicons/woodgreen.ico",
    },
    businessType: "Landscaping",
    defaultEmailSignature:
      "Best regards,\nWOODGREEN LANDSCAPING Team\nwoodgreenlandscaping.com",
    serviceTypes: [
      "Lawn Mowing & Edging",
      "Fall Cleanup",
      "Spring Cleanup",
      "Hedge Trimming",
      "Weed Removal",
      "Sod Laying",
      "Lawn Levelling",
      "Aeration",
      "Dethatching",
      "Fertilization",
      "Mulching",
      "Pruning & Trimming",
      "Tree Services",
      "Garden Design",
      "Hardscaping",
      "Irrigation Installation & Repair",
      "Pest Control",
      "Overseeding",
      "Landscape Design & Installation",
      "Seasonal Maintenance",
    ],
    pricingStructure: "project",
    communicationStyle: "Friendly and professional",
  },
  whiteknight: {
    id: "whiteknight",
    name: "White Knight Snow Service",
    domain: "whiteknightsnowservice.com",
    description: "Reliable Snow Removal Services",
    brand: {
      primaryColor: "#1e40af",
      secondaryColor: "#9ca3af",
      logo: "/logos/whiteknight-logo.png",
      favicon: "/favicons/whiteknight.ico",
    },
    businessType: "Snow Removal",
    defaultEmailSignature:
      "Stay safe,\nWhite Knight Snow Service\nwhiteknightsnowservice.com",
    serviceTypes: [
      "Snow Removal - Single Driveway",
      "Snow Removal - Double Driveway",
      "Snow Removal - Triple Driveway",
      "Sidewalk Clearing",
      "Parking Lot Plowing",
      "Commercial Snow Removal",
      "Sodium Chloride (Rock Salt) Application",
      "Calcium Chloride De-icing",
      "Magnesium Chloride De-icing",
      "Sand Application",
      "Salt/Sand Mix Application",
      "Pre-Storm Salting",
      "Post-Storm De-icing",
      "Roof Snow Removal",
      "Extensive Snow Removal (12+ inches)",
      "Light Snow Service (1-5cm)",
      "Medium Snow Service (5-15cm)",
      "Heavy Snow Service (15cm+)",
      "Ice Dam Prevention",
      "Snow Hauling & Disposal",
      "24/7 Emergency Service",
      "Seasonal Contract",
      "Per Visit Service",
    ],
    pricingStructure: "seasonal",
    communicationStyle: "Reliable and straightforward",
  },
  pupawalk: {
    id: "pupawalk",
    name: "PUPAWALK PET SERVICES",
    domain: "pupawalk.com",
    description: "Professional Pet Care Services",
    brand: {
      primaryColor: "#dc2626",
      secondaryColor: "#9ca3af",
      logo: "/logos/pupawalk-logo.png",
      favicon: "/favicons/pupawalk.ico",
    },
    businessType: "Pet Services",
    defaultEmailSignature: "Pawsitively yours,\nPUPAWALK PET SERVICES Team\npupawalk.com",
    serviceTypes: [
      "Dog Walking - 15 min",
      "Dog Walking - 30 min",
      "Dog Walking - 60 min",
      "Group Dog Walking",
      "Pet Sitting - In-Home",
      "Pet Sitting - Overnight",
      "Pet Sitting - Weekend",
      "Drop-in Visits",
      "Dog Boarding - Home",
      "Dog Boarding - Facility",
      "Dog Daycare",
      "Cat Sitting",
      "Small Animal Care",
      "Pet Transportation",
      "Vet Visit Transport",
      "Basic Grooming",
      "Bath & Brush",
      "Nail Trimming",
      "Ear Cleaning",
      "Puppy Care",
      "Senior Pet Care",
      "Special Needs Pet Care",
      "Medication Administration",
      "Dog Training - Basic Obedience",
      "House Sitting with Pet Care",
      "Holiday Pet Care",
      "Emergency Pet Care",
    ],
    pricingStructure: "hourly",
    communicationStyle: "Warm and caring",
  },
  // Legacy aliases for backward compatibility
  landscaping: {
    id: "landscaping",
    name: "WOODGREEN LANDSCAPING",
    domain: "woodgreenlandscaping.com",
    description: "Professional Landscaping Services",
    brand: {
      primaryColor: "#059669",
      secondaryColor: "#6b7280",
      logo: "/logos/woodgreen-logo.png",
      favicon: "/favicons/woodgreen.ico",
    },
    businessType: "Landscaping",
    defaultEmailSignature: "Best regards,\nWOODGREEN LANDSCAPING Team\nwoodgreenlandscaping.com",
    serviceTypes: [
      "Lawn Mowing & Edging",
      "Fall Cleanup",
      "Spring Cleanup",
      "Hedge Trimming",
      "Weed Removal",
      "Sod Laying",
      "Lawn Levelling",
      "Aeration",
      "Dethatching",
      "Fertilization",
      "Mulching",
      "Pruning & Trimming",
      "Tree Services",
      "Garden Design",
      "Hardscaping",
      "Irrigation Installation & Repair",
      "Pest Control",
      "Overseeding",
      "Landscape Design & Installation",
      "Seasonal Maintenance",
    ],
    pricingStructure: "project",
    communicationStyle: "Friendly and professional",
  },
  "snow-removal": {
    id: "snow-removal",
    name: "White Knight Snow Service",
    domain: "whiteknightsnowservice.com",
    description: "Reliable Snow Removal Services",
    brand: {
      primaryColor: "#1e40af",
      secondaryColor: "#9ca3af",
      logo: "/logos/whiteknight-logo.png",
      favicon: "/favicons/whiteknight.ico",
    },
    businessType: "Snow Removal",
    defaultEmailSignature: "Stay safe,\nWhite Knight Snow Service\nwhiteknightsnowservice.com",
    serviceTypes: [
      "Snow Removal - Single Driveway",
      "Snow Removal - Double Driveway",
      "Snow Removal - Triple Driveway",
      "Sidewalk Clearing",
      "Parking Lot Plowing",
      "Commercial Snow Removal",
      "Sodium Chloride (Rock Salt) Application",
      "Calcium Chloride De-icing",
      "Magnesium Chloride De-icing",
      "Sand Application",
      "Salt/Sand Mix Application",
      "Pre-Storm Salting",
      "Post-Storm De-icing",
      "Roof Snow Removal",
      "Extensive Snow Removal (12+ inches)",
      "Light Snow Service (1-5cm)",
      "Medium Snow Service (5-15cm)",
      "Heavy Snow Service (15cm+)",
      "Ice Dam Prevention",
      "Snow Hauling & Disposal",
      "24/7 Emergency Service",
      "Seasonal Contract",
      "Per Visit Service",
    ],
    pricingStructure: "seasonal",
    communicationStyle: "Reliable and straightforward",
  },
  "pet-services": {
    id: "pet-services",
    name: "PUPAWALK PET SERVICES",
    domain: "pupawalk.com",
    description: "Professional Pet Care Services",
    brand: {
      primaryColor: "#dc2626",
      secondaryColor: "#9ca3af",
      logo: "/logos/pupawalk-logo.png",
      favicon: "/favicons/pupawalk.ico",
    },
    businessType: "Pet Services",
    defaultEmailSignature: "Pawsitively yours,\nPUPAWALK PET SERVICES Team\npupawalk.com",
    serviceTypes: [
      "Dog Walking - 15 min",
      "Dog Walking - 30 min",
      "Dog Walking - 60 min",
      "Group Dog Walking",
      "Pet Sitting - In-Home",
      "Pet Sitting - Overnight",
      "Pet Sitting - Weekend",
      "Drop-in Visits",
      "Dog Boarding - Home",
      "Dog Boarding - Facility",
      "Dog Daycare",
      "Cat Sitting",
      "Small Animal Care",
      "Pet Transportation",
      "Vet Visit Transport",
      "Basic Grooming",
      "Bath & Brush",
      "Nail Trimming",
      "Ear Cleaning",
      "Puppy Care",
      "Senior Pet Care",
      "Special Needs Pet Care",
      "Medication Administration",
      "Dog Training - Basic Obedience",
      "House Sitting with Pet Care",
      "Holiday Pet Care",
      "Emergency Pet Care",
    ],
    pricingStructure: "hourly",
    communicationStyle: "Warm and caring",
  },
};

export function getServiceById(serviceId: string): Service | null {
  return serviceConfig[serviceId] || null;
}

export function getAllServices(): Service[] {
  // Return only the primary service IDs to avoid duplicates
  const primaryServiceIds = ['portfolio', 'woodgreen', 'whiteknight', 'pupawalk'];
  return primaryServiceIds.map(id => serviceConfig[id]).filter(Boolean);
}

export function getServiceByDomain(domain: string): Service | null {
  return (
    Object.values(serviceConfig).find((service) => service.domain === domain) ||
    null
  );
}
