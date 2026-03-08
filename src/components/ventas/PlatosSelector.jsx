import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PlatosSelector({ platos, onAgregar }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("todos");

  const categorias = ["Entradas", "Bebidas", "Stop Premium", "Ramen", "Recetas Virales", "Menú Infantil", "Adicionales", "Rolls Tempura", "Rolls Frescos"];

  const filteredPlatos = platos.filter(plato => {
    const matchesSearch = plato.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === "todos" || plato.categoria === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <Card className="shadow-lg border-none">
      <CardHeader>
        <CardTitle>Seleccionar Platos</CardTitle>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar platos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex-wrap h-auto justify-start gap-1 p-2 mb-4">
            <TabsTrigger value="todos" className="text-xs">Todos</TabsTrigger>
            {categorias.map(cat => (
              <TabsTrigger key={cat} value={cat} className="text-xs">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
              {filteredPlatos.map(plato => (
                <div
                  key={plato.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-all cursor-pointer"
                  onClick={() => onAgregar(plato)}
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{plato.nombre}</h4>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {plato.categoria}
                    </Badge>
                    <p className="text-lg font-bold text-green-600 mt-2">
                      ${plato.precio.toFixed(2)}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAgregar(plato);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}