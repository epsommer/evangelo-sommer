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
  // Legacy support - will be removed
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
    serviceTypes: ["Lawn Care", "Garden Design", "Tree Services", "Hardscaping", "Maintenance"],
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
    serviceTypes: ["Residential Snow Removal", "Commercial Plowing", "Salt/Sand Application", "Emergency Service"],
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
    serviceTypes: ["Dog Walking", "Pet Sitting", "Pet Transportation", "Basic Grooming"],
    pricingStructure: "hourly",
    communicationStyle: "Warm and caring",
  },
  portfolio: {
    id: "portfolio",
    name: "Evangelo Sommer Development",
    domain: "evangelosommer.com",
    description: "Web Development & Digital Solutions",
    brand: {
      primaryColor: "#2563eb",
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
      "Lawn Care",
      "Garden Design",
      "Tree Services",
      "Hardscaping",
      "Maintenance",
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
      "Residential Snow Removal",
      "Commercial Plowing",
      "Salt/Sand Application",
      "Emergency Service",
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
      "Dog Walking",
      "Pet Sitting",
      "Pet Transportation",
      "Basic Grooming",
    ],
    pricingStructure: "hourly",
    communicationStyle: "Warm and caring",
  },
};

export function getServiceById(serviceId: string): Service | null {
  return serviceConfig[serviceId] || null;
}

export function getAllServices(): Service[] {
  return Object.values(serviceConfig);
}

export function getServiceByDomain(domain: string): Service | null {
  return (
    Object.values(serviceConfig).find((service) => service.domain === domain) ||
    null
  );
}
