// src/app/services/[serviceId]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import CRMLayout from "@/components/CRMLayout";
import { getServiceById } from "../../../lib/service-config";
import { clientManager } from "../../../lib/client-config";
import { MultiServiceManager } from "../../../lib/multi-service-utils";
import { Client } from "../../../types/client";

export default function ServiceDashboard() {
  const params = useParams();
  const { status } = useSession();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);

  const serviceId = params.serviceId as string;
  const service = getServiceById(serviceId);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (service) {
      const serviceClients = MultiServiceManager.getClientsForService(serviceId);
      setClients(serviceClients);
    }
  }, [serviceId, service]);

  if (status === "loading") {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-gold border-t-transparent animate-spin mx-auto mb-4"></div>
            <p className="text-medium-grey font-space-grotesk uppercase tracking-wide">LOADING SERVICE...</p>
          </div>
        </div>
      </CRMLayout>
    );
  }

  if (!service) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold text-dark-grey mb-2 font-space-grotesk uppercase tracking-wide">
              SERVICE NOT FOUND
            </h1>
            <p className="text-medium-grey mb-4 font-space-grotesk">
              THE SERVICE YOU'RE LOOKING FOR DOESN'T EXIST.
            </p>
            <Button
              className="bg-gold text-dark-grey hover:bg-gold-light font-space-grotesk font-bold uppercase tracking-wide"
              onClick={() => router.push("/dashboard")}
            >
              ← BACK TO DASHBOARD
            </Button>
          </div>
        </div>
      </CRMLayout>
    );
  }

  const activeClients = clients.filter((c) => c.status === "active").length;
  const prospects = clients.filter((c) => c.status === "prospect").length;
  // const completedProjects = clients.filter(
  //   (c) => c.status === "completed",
  // ).length;
  const totalRevenue = clients.reduce(
    (sum, client) => sum + (client.budget || 0),
    0,
  );

  return (
    <CRMLayout>
      <div className="p-6">
        {/* Page Header */}
        <div className="bg-off-white p-6 border-b-2 border-gold mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 flex items-center justify-center text-white font-bold font-space-grotesk"
                  style={{ backgroundColor: service.brand.primaryColor }}
                >
                  {service.name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-dark-grey uppercase tracking-wide font-space-grotesk mb-2">
                    {service.name.toUpperCase()}
                  </h1>
                  <p className="text-medium-grey font-space-grotesk uppercase tracking-wide text-sm">
                    {service.description?.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                className="bg-gold text-dark-grey hover:bg-gold-light font-space-grotesk font-bold uppercase tracking-wide text-sm"
                onClick={() => router.push(`/clients/new?serviceId=${serviceId}`)}
              >
                ADD {service.businessType?.toUpperCase()} CLIENT
              </Button>
              <Button
                className="bg-dark-grey text-white hover:bg-medium-grey font-space-grotesk font-bold uppercase tracking-wide text-sm"
                onClick={() => window.open(`https://${service.domain}`, '_blank')}
              >
                VISIT {service.domain?.toUpperCase()} ↗
              </Button>
            </div>
          </div>
        </div>

        {/* Service Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-white border-2 border-light-grey">
            <div className="text-2xl font-bold text-dark-grey font-space-grotesk">
              {clients.length}
            </div>
            <div className="text-sm text-medium-grey font-space-grotesk uppercase tracking-wide">
              TOTAL CLIENTS
            </div>
          </Card>

          <Card className="p-4 bg-white border-2 border-light-grey">
            <div className="text-2xl font-bold text-gold font-space-grotesk">
              {activeClients}
            </div>
            <div className="text-sm text-medium-grey font-space-grotesk uppercase tracking-wide">
              ACTIVE PROJECTS
            </div>
          </Card>

          <Card className="p-4 bg-white border-2 border-light-grey">
            <div className="text-2xl font-bold text-dark-grey font-space-grotesk">
              {prospects}
            </div>
            <div className="text-sm text-medium-grey font-space-grotesk uppercase tracking-wide">
              PROSPECTS
            </div>
          </Card>

          <Card className="p-4 bg-white border-2 border-light-grey">
            <div className="text-2xl font-bold text-gold font-space-grotesk">
              ${totalRevenue.toLocaleString()}
            </div>
            <div className="text-sm text-medium-grey font-space-grotesk uppercase tracking-wide">
              PIPELINE VALUE
            </div>
          </Card>
        </div>

        {/* Service-Specific Quick Actions */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-dark-grey mb-4 font-space-grotesk uppercase tracking-wide">
            {service.businessType?.toUpperCase()} SERVICES
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {service.serviceTypes.map((serviceType, index) => {
              const typeClients = clients.filter((c) =>
                c.serviceTypes.includes(serviceType),
              );
              return (
                <Card
                  key={index}
                  className="p-4 bg-white border-2 border-light-grey hover:bg-off-white transition-colors cursor-pointer border-l-4"
                  style={{ borderLeftColor: service.brand.primaryColor }}
                >
                  <div className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide text-sm">
                    {serviceType.toUpperCase()}
                  </div>
                  <div className="text-sm text-medium-grey mt-1 font-space-grotesk">
                    {typeClients.length} CLIENTS
                  </div>
                  <div className="text-xs text-medium-grey mt-2 font-space-grotesk">
                    ${typeClients
                      .reduce((sum, c) => sum + (c.budget || 0), 0)
                      .toLocaleString()} VALUE
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Clients for This Service */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
              {service.businessType?.toUpperCase()} CLIENTS
            </h2>
            <Button
              className="text-gold hover:text-gold-dark font-space-grotesk font-bold uppercase tracking-wide text-sm"
              variant="outline"
              onClick={() => router.push(`/clients?service=${serviceId}`)}
            >
              VIEW ALL →
            </Button>
          </div>

          {clients.length === 0 ? (
            <Card className="p-8 text-center bg-white border-2 border-light-grey">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-lg font-bold text-dark-grey mb-2 font-space-grotesk uppercase tracking-wide">
                NO {service.businessType?.toUpperCase()} CLIENTS YET
              </h3>
              <p className="text-medium-grey mb-4 font-space-grotesk">
                START BUILDING YOUR {service.businessType?.toUpperCase()} CLIENT BASE TO TRACK PROJECTS AND RELATIONSHIPS.
              </p>
              <Button
                className="bg-gold text-dark-grey hover:bg-gold-light font-space-grotesk font-bold uppercase tracking-wide"
                onClick={() => router.push(`/clients/new?serviceId=${serviceId}`)}
              >
                ADD YOUR FIRST {service.businessType?.toUpperCase()} CLIENT
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients
                .sort(
                  (a, b) =>
                    new Date(b.updatedAt).getTime() -
                    new Date(a.updatedAt).getTime(),
                )
                .slice(0, 6)
                .map((client) => (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    className="block"
                  >
                    <Card
                      className="bg-white border-2 border-light-grey hover:bg-off-white transition-colors p-4 border-l-4"
                      style={{ borderLeftColor: service.brand.primaryColor }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-dark-grey font-space-grotesk">
                            {client.name?.toUpperCase()}
                          </h3>
                          {client.company && (
                            <div className="text-sm text-medium-grey font-space-grotesk">
                              {client.company.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-bold uppercase font-space-grotesk ${
                            client.status === "active"
                              ? "bg-gold text-dark-grey"
                              : client.status === "prospect"
                                ? "bg-light-grey text-medium-grey"
                                : client.status === "completed"
                                  ? "bg-dark-grey text-white"
                                  : "bg-medium-grey text-white"
                          }`}
                        >
                          {client.status?.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-sm text-medium-grey space-y-1 font-space-grotesk">
                        <div>📧 {client.email?.toUpperCase()}</div>
                        {client.projectType && <div>🏗️ {client.projectType.toUpperCase()}</div>}
                        {client.serviceTypes.length > 0 && (
                          <div>
                            🔧 {client.serviceTypes.slice(0, 2).join(", ").toUpperCase()}
                          </div>
                        )}
                        {client.budget && (
                          <div>💰 ${client.budget.toLocaleString()}</div>
                        )}
                        {client.address && (
                          <div>
                            📍 {client.address.city?.toUpperCase()}, {client.address.state?.toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 text-xs text-medium-grey font-space-grotesk uppercase tracking-wide">
                        UPDATED: {new Date(client.updatedAt).toLocaleDateString().toUpperCase()}
                      </div>
                    </Card>
                  </Link>
                ))}
            </div>
          )}
        </div>
      </div>
    </CRMLayout>
  );
}
