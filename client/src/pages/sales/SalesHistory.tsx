import { useState, useEffect } from "react";
import { Download, MessageCircle, FileText, Search, Clock, Phone, FileDown, Table } from "lucide-react";
import { getSalesHistory } from "../../services/sales.service";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface SaleInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string | null;
  clientPhone: string | null;
  totalTTC: number;
  paymentMethod: string;
  status: string;
  pdfUrl: string | null;
  createdAt: string;
  cashier: {
    firstName: string;
    lastName: string;
  };
  items: Array<{
    quantity: number;
    totalLineTTC: number;
    product: {
      name: string;
    };
  }>;
}

const SalesHistory = () => {
  const [sales, setSales] = useState<SaleInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await getSalesHistory();
      setSales(data);
    } catch (error) {
      toast.error("Impossible de charger l'historique des ventes.");
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(s => 
    s.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.clientName && s.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getWhatsappLink = (phone: string, pdfUrl: string) => {
    // Nettoyage : on garde uniquement les chiffres
    let cleanPhone = phone.replace(/\D/g, "");
    
    // Si c'est un numéro local ivoirien de 10 chiffres (ex: 0777620864), on ajoute l'indicatif 225
    if (cleanPhone.length === 10 && cleanPhone.startsWith("0")) {
      cleanPhone = `225${cleanPhone}`;
    }

    const message = encodeURIComponent(`Bonjour, voici votre reçu d'achat : ${pdfUrl}`);
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  const exportPDF = () => {
    // Fix potential jsPDF instantiation issue in Vite
    const JSPDFClass = typeof jsPDF === 'function' ? jsPDF : (jsPDF as any).default;
    const doc = new JSPDFClass();
    doc.text("Historique des Ventes", 14, 15);
    
    autoTable(doc, {
      startY: 20,
      head: [["Date", "N° Facture", "Client", "Vendeur", "Montant (FCFA)", "Méthode"]],
      body: filteredSales.map(sale => [
        dayjs(sale.createdAt).format("DD/MM/YYYY HH:mm"),
        sale.invoiceNumber,
        sale.clientName || "Client de passage",
        `${sale.cashier.firstName} ${sale.cashier.lastName}`,
        sale.totalTTC.toLocaleString(),
        sale.paymentMethod
      ])
    });
    
    doc.save("Historique_Ventes.pdf");
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Ventes");
    
    sheet.columns = [
      { header: "Date", key: "date", width: 20 },
      { header: "N° Facture", key: "invoice", width: 20 },
      { header: "Client", key: "client", width: 30 },
      { header: "Vendeur", key: "cashier", width: 30 },
      { header: "Montant (FCFA)", key: "amount", width: 15 },
      { header: "Méthode de Paiement", key: "method", width: 20 }
    ];
    
    filteredSales.forEach(sale => {
      sheet.addRow({
        date: dayjs(sale.createdAt).format("DD/MM/YYYY HH:mm"),
        invoice: sale.invoiceNumber,
        client: sale.clientName || "Client de passage",
        cashier: `${sale.cashier.firstName} ${sale.cashier.lastName}`,
        amount: sale.totalTTC,
        method: sale.paymentMethod
      });
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, "Historique_Ventes.xlsx");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historique des Ventes</h1>
          <p className="text-gray-500 mt-1">Consultez les factures générées et partagez-les avec vos clients.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Rechercher (N° Facture, Client)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff5722] focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={exportPDF}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium text-sm"
              title="Exporter en PDF"
            >
              <FileDown className="w-5 h-5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={exportExcel}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors font-medium text-sm"
              title="Exporter en Excel"
            >
              <Table className="w-5 h-5" />
              <span className="hidden sm:inline">Excel</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#ff5722] rounded-full animate-spin mb-4" />
            Chargement...
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <FileText className="w-12 h-12 text-gray-300 mb-4" />
            <p>Aucune facture trouvée.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-200">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-sm font-semibold text-gray-600">Date & Facture</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Client</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Vendeur</th>
                  <th className="p-4 text-sm font-semibold text-gray-600 text-right">Montant</th>
                  <th className="p-4 text-sm font-semibold text-gray-600 text-center">Partage</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Clock className="w-4 h-4" />
                        {dayjs(sale.createdAt).format("DD/MM/YYYY à HH:mm")}
                      </div>
                      <div className="font-bold text-gray-900">{sale.invoiceNumber}</div>
                      <div className="text-xs text-gray-400 mt-1">{sale.items.length} article(s)</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-800">{sale.clientName || "Client de passage"}</div>
                      {sale.clientPhone && (
                        <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" /> {sale.clientPhone}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {sale.cashier.firstName} {sale.cashier.lastName}
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-bold text-[#ff5722]">{sale.totalTTC.toLocaleString()} F</div>
                      <div className="text-xs text-gray-500 mt-1 uppercase">{sale.paymentMethod}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {sale.pdfUrl ? (
                          <>
                            <a
                              href={sale.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 text-gray-600 hover:text-[#ff5722] hover:bg-orange-50 rounded-lg transition-colors flex flex-col items-center"
                              title="Télécharger PDF"
                            >
                              <Download className="w-5 h-5" />
                            </a>
                            {sale.clientPhone && (
                              <a
                                href={getWhatsappLink(sale.clientPhone, sale.pdfUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors flex flex-col items-center"
                                title="Envoyer sur WhatsApp"
                              >
                                <MessageCircle className="w-5 h-5" />
                              </a>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 italic">En cours...</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesHistory;
