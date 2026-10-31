
export type DemoLoad = {
  id: string;
  pickup: string;
  delivery: string;
  cargo: string;
  weightKg: number;
  pickupDate: string;
};

export type DemoLeg = {
  id: string;
  truck: string;
  origin: string;
  destination: string;
  capacityKg: number;
  departure: string;
};

export const sampleLoads: DemoLoad[] = [
  {
    id: "LOAD-001",
    pickup: "Mumbai",
    delivery: "Lonavala",
    cargo: "Industrial Components",
    weightKg: 2000,
    pickupDate: "Example date",
  },
  {
    id: "LOAD-002",
    pickup: "Bhiwandi",
    delivery: "Chakan",
    cargo: "Packaging Materials",
    weightKg: 1500,
    pickupDate: "Example date",
  },
];

export const sampleLegs: DemoLeg[] = [
  {
    id: "LEG-001",
    truck: "MH-12-AB-1234",
    origin: "Mumbai",
    destination: "Pune",
    capacityKg: 4000,
    departure: "Example departure",
  },
  {
    id: "LEG-002",
    truck: "MH-14-CD-5678",
    origin: "Bhiwandi",
    destination: "Chakan",
    capacityKg: 3000,
    departure: "Example departure",
  },
];

export const sampleMatches = [
  {
    id: "MATCH-001",
    truck: "MH-12-AB-1234",
    truckRoute: "Mumbai → Pune",
    loadRoute: "Mumbai → Lonavala",
    capacityKg: 4000,
    requestedKg: 2000,
    matchType: "Partial-route example",
    score: 94,
    price: 6200,
    baseline: 8500,
    explanation:
      "Illustrates a shipment that ends before the truck's final destination. Actual eligibility must still be calculated.",
  },
  {
    id: "MATCH-002",
    truck: "MH-04-EF-9012",
    truckRoute: "Bhiwandi → Chakan",
    loadRoute: "Bhiwandi → Chakan",
    capacityKg: 3000,
    requestedKg: 1500,
    matchType: "Full-route example",
    score: 91,
    price: 4700,
    baseline: 6500,
    explanation:
      "Illustrates matching pickup and delivery endpoints. Time, cargo and equipment checks are still required.",
  },
  {
    id: "MATCH-003",
    truck: "MH-12-GH-3456",
    truckRoute: "Mumbai → Pune",
    loadRoute: "Panvel → Lonavala",
    capacityKg: 3500,
    requestedKg: 1200,
    matchType: "Intermediate-stop example",
    score: 87,
    price: 5100,
    baseline: 7000,
    explanation:
      "Illustrates pickup and delivery at intermediate points along an existing truck journey.",
  },
];

export const sampleBookings = [
  {
    id: "BOOK-001",
    route: "Mumbai → Lonavala",
    carrier: "Example Carrier A",
    weight: "2,000 kg",
    status: "Pending Approval",
    variant: "warning" as const,
  },
  {
    id: "BOOK-002",
    route: "Bhiwandi → Chakan",
    carrier: "Example Carrier B",
    weight: "1,500 kg",
    status: "Confirmed",
    variant: "success" as const,
  },
];

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
