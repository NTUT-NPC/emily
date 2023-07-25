-- CreateTable
CREATE TABLE "Metarole" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3),
    "guild" BIGINT NOT NULL,
    "role" BIGINT NOT NULL,
    "memberRoles" BIGINT[],

    CONSTRAINT "Metarole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Metarole_role_key" ON "Metarole"("role");
