// src/lib/units.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

function normalizeList(x) {
  if (Array.isArray(x)) return x;
  if (x && Array.isArray(x.value)) return x.value;
  return [];
}

export function useUnits() {
  return useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const res = await api("/api/units/");
      return normalizeList(res);
    },
  });
}

export function useAssignUnit() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ serviceId, unitId }) => {
      return api(`/api/services/services/${serviceId}/assign-unit`, {
        method: "POST",
        body: { unit_id: unitId },
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["services"] });
    },
  });
}