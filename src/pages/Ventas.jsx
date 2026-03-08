import { useState, useEffect } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ShoppingCart, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const Ventas = () => {
  const [platos, setPlatos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [total, setTotal] = useState(0);

  // 1. Cargar los platos disponibles desde tu base local
  useEffect(() => {
    const cargarPlatos = async () => {
      const data = await base44.entities.Plato.list();
      setPlatos(data);
    };
    cargarPlatos();
  }, []);

  // 2. Calcular total cada vez que cambie el carrito
  useEffect(() => {
    const nuevoTotal = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    setTotal(nuevoTotal);
  }, [carrito]);

  const agregarAlCarrito = (plato) => {
    const existe = carrito.find(item => item.id === plato.id);
    if (existe) {
      setCarrito(carrito.map(item => 
        item.id === plato.id ? { ...item, cantidad: item.cantidad + 1 } : item
      ));
    } else {
      setCarrito([...carrito, { ...plato, cantidad: 1 }]);
    }
    toast.success(`${plato.nombre} añadido`);
  };

  const quitarDelCarrito = (id) => {
    setCarrito(carrito.filter(item => item.id !== id));
  };

  const finalizarVenta = async () => {
    if (carrito.length === 0) return toast.error("El carrito está vacío");

    const nuevaVenta = {
      fecha_hora: new Date().toISOString(),
      total_venta: total,
      metodo_pago: "Efectivo",
      costo_total: 0,
      ganancia: 0,
      empleado_id: JSON.parse(localStorage.getItem("st_sushi_Empleado"))[0].id,
      items: carrito
    };

    try {
      await base44.entities.Venta.create(nuevaVenta);
      setCarrito([]);
      toast.success("¡Venta registrada con éxito!");
    } catch (error) {
      toast.error("Error al guardar la venta");
    }
  };

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* SECCIÓN DE PLATOS */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="text-red-600" /> Menú Disponible
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platos.map((plato) => (
            <Card key={plato.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => agregarAlCarrito(plato)}>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-lg">{plato.nombre}</p>
                  <p className="text-slate-500">${plato.precio}</p>
                </div>
                <Button size="icon" variant="outline" className="rounded-full">
                  <Plus className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* SECCIÓN DEL CARRITO / TICKET */}
      <div className="lg:col-span-1">
        <Card className="sticky top-24 border-2 border-red-100">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-xl flex items-center gap-2">
              Detalle del Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {carrito.length === 0 ? (
              <p className="text-center text-slate-400 py-10">No hay productos seleccionados</p>
            ) : (
              carrito.map((item) => (
                <div key={item.id} className="flex justify-between items-center border-b pb-2">
                  <div className="flex-1">
                    <p className="font-medium">{item.nombre} x{item.cantidad}</p>
                    <p className="text-sm text-slate-500">${item.precio * item.cantidad}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => quitarDelCarrito(item.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))
            )}

            <div className="pt-4 border-t-2">
              <div className="flex justify-between text-xl font-bold mb-4">
                <span>TOTAL:</span>
                <span className="text-red-600">${total}</span>
              </div>
              <Button className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg" onClick={finalizarVenta}>
                <CheckCircle2 className="mr-2" /> Finalizar Pedido
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Ventas;