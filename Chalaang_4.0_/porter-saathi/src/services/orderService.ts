// src/services/orderService.ts
import { callApi } from './api';

export interface Order {
  _id: string;
  trackingId: string;
  customerName?: string;
  items?: string[];
  address?: string;
  status?: "Processing" | "Shipped" | "Delivered" | string;
  pickupTime?: string;
  assignedTo?: string;
}

export async function trackOrder(trackingId: string): Promise<Order> {
  return callApi<Order>(`orders/track/${trackingId}`);
}

export async function updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
  return callApi<Order>(`orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteOrder(id: string): Promise<{ success: boolean }> {
  return callApi<{ success: boolean }>(`orders/${id}`, {
    method: 'DELETE',
  });
}

export async function listOrders(): Promise<Order[]> {
  return callApi<Order[]>('orders/list');
}

export async function createOrder(order: Partial<Order>): Promise<Order> {
  return callApi<Order>('orders/create', {
    method: 'POST',
    body: JSON.stringify(order),
  });
}
