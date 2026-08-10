// @ts-nocheck
import { useState, type FormEvent } from "react";
import { useTable, useInsert, useUpdate, rpc, money, fmtDate, titleCase, type Row } from "@/lib/core";
import { useApp } from "@/contexts/AppContext";
import { Plus } from "lucide-react";
import { PageTitle, Card, Field, Input, Select, Textarea, Modal, Table, Td, Badge, Empty, Loading, ErrorText, Tabs, Button, StatCard, KPICard } from "@/components/negolinks/ui";

export default function Procurement() {
  const { settings, isStaff } = useApp();
  const sym = settings.currency_symbol;
  const [tab, setTab] = useState("Purchase orders");

  const { data: vendors, isLoading } = useTable("vendors");
  const { data: pos } = useTable("purchase_orders", { select: "*, vendors(name)" });
  const { data: assets } = useTable("asset_depreciation", { order: "asset_tag", asc: true });
  const { data: inventory } = useTable("inventory_items", { order: "name", asc: true });

  const insertVendor = useInsert("vendors");
  const insertPo = useInsert("purchase_orders");
  const updatePo = useUpdate("purchase_orders");
  const insertAsset = useInsert("assets", ["asset_depreciation"]);
  const insertItem = useInsert("inventory_items");
  const updateItem = useUpdate("inventory_items");

  const [modal, setModal] = useState<"" | "vendor" | "po" | "asset" | "item">("");
  const [vForm, setVForm] = useState<Row>({ name: "", category: "", phone: "", email: "" });
  const [pForm, setPForm] = useState<Row>({ vendor_id: "", description: "", amount: "" });
  const [aForm, setAForm] = useState<Row>({ name: "", category: "Equipment", purchase_cost: "", purchase_date: new Date().toISOString().slice(0, 10), useful_life_years: 5, salvage_value: 0 });
  const [iForm, setIForm] = useState<Row>({ name: "", category: "Office Supplies", unit: "unit", quantity: 0, reorder_level: 0 });

  if (isLoading) return <Loading />;

  return (
    <div>
      <PageTitle title="Procurement & Assets" sub="Vendors, purchase orders, asset register and office inventory" action={
        isStaff ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setModal("vendor")}><Plus size={15} /> Vendor</Button>
            <Button variant="ghost" onClick={() => setModal("asset")}><Plus size={15} /> Asset</Button>
            <Button variant="ghost" onClick={() => setModal("item")}><Plus size={15} /> Inventory item</Button>
            <Button onClick={() => setModal("po")}><Plus size={16} /> Purchase order</Button>
          </div>
        ) : undefined
      } />
      <Tabs tabs={["Purchase orders", "Vendors", "Assets", "Inventory"]} active={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === "Vendors" ? (
          <Card>
            {(vendors ?? []).length === 0 ? <Empty title="No vendors" hint="Register vendors to raise purchase orders." /> : (
              <Table headers={["Vendor", "Category", "Phone", "Email", "Status"]}>
                {(vendors ?? []).map((v) => (
                  <tr key={v.id} className="border-b border-line">
                    <Td className="font-medium">{v.name}</Td>
                    <Td>{v.category ?? "—"}</Td>
                    <Td>{v.phone ?? "—"}</Td>
                    <Td>{v.email ?? "—"}</Td>
                    <Td><Badge tone={v.active ? "good" : "neutral"}>{v.active ? "Active" : "Inactive"}</Badge></Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        ) : null}

        {tab === "Purchase orders" ? (
          <Card>
            {(pos ?? []).length === 0 ? <Empty title="No purchase orders" hint="Raise a purchase order against a registered vendor." /> : (
              <Table headers={["PO №", "Vendor", "Description", "Amount", "Status", "Ordered", ""]} passbook>
                {(pos ?? []).map((p) => (
                  <tr key={p.id}>
                    <Td mono>{p.po_number}</Td>
                    <Td className="font-medium">{p.vendors?.name}</Td>
                    <Td>{p.description}</Td>
                    <Td mono right>{money(p.amount, sym)}</Td>
                    <Td><Badge tone={p.status === "received" ? "good" : p.status === "cancelled" ? "bad" : p.status === "approved" ? "info" : "warn"}>{titleCase(p.status)}</Badge></Td>
                    <Td>{fmtDate(p.ordered_on, settings.date_format)}</Td>
                    <Td>{isStaff ? (
                      <Select defaultValue={p.status} onChange={(e) => updatePo.mutate({ id: p.id, values: { status: e.target.value, received_on: e.target.value === "received" ? new Date().toISOString().slice(0, 10) : null } })} className="max-w-[130px]">
                        {["draft", "approved", "received", "cancelled"].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                      </Select>
                    ) : null}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        ) : null}

        {tab === "Assets" ? (
          <Card>
            {(assets ?? []).length === 0 ? <Empty title="No assets registered" hint="Register assets to track straight-line depreciation automatically." /> : (
              <Table headers={["Tag", "Asset", "Category", "Cost", "Monthly dep.", "Accumulated", "Net book value"]} passbook>
                {(assets ?? []).map((a) => (
                  <tr key={a.id}>
                    <Td mono>{a.asset_tag}</Td>
                    <Td className="font-medium">{a.name}</Td>
                    <Td>{a.category}</Td>
                    <Td mono right>{money(a.purchase_cost, sym)}</Td>
                    <Td mono right>{money(a.monthly_depreciation, sym)}</Td>
                    <Td mono right>{money(a.accumulated_depreciation, sym)}</Td>
                    <Td mono right className="font-semibold">{money(Number(a.purchase_cost) - Number(a.accumulated_depreciation), sym)}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        ) : null}

        {tab === "Inventory" ? (
          <Card>
            {(inventory ?? []).length === 0 ? <Empty title="No inventory items" hint="Track office supplies with reorder levels." /> : (
              <Table headers={["Item", "Category", "Quantity", "Reorder level", "Status", ""]}>
                {(inventory ?? []).map((i) => (
                  <tr key={i.id} className="border-b border-line">
                    <Td className="font-medium">{i.name}</Td>
                    <Td>{i.category}</Td>
                    <Td mono right>{Number(i.quantity)} {i.unit}</Td>
                    <Td mono right>{Number(i.reorder_level)}</Td>
                    <Td>{Number(i.quantity) <= Number(i.reorder_level) ? <Badge tone="bad">Reorder</Badge> : <Badge tone="good">In stock</Badge>}</Td>
                    <Td>{isStaff ? (
                      <form className="flex justify-end gap-2" onSubmit={(e: FormEvent) => {
                        e.preventDefault();
                        const el = (e.target as HTMLFormElement).elements.namedItem("qty") as HTMLInputElement;
                        updateItem.mutate({ id: i.id, values: { quantity: Number(el.value) } });
                      }}>
                        <Input name="qty" type="number" min="0" step="0.01" defaultValue={i.quantity} className="max-w-[110px]" />
                        <Button type="submit" variant="ghost">Set</Button>
                      </form>
                    ) : null}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        ) : null}
      </div>

      <Modal open={modal === "vendor"} onClose={() => setModal("")} title="New vendor">
        <form className="space-y-4" onSubmit={(e: FormEvent) => { e.preventDefault(); insertVendor.mutate(vForm, { onSuccess: () => setModal("") }); }}>
          <Field label="Vendor name"><Input required value={vForm.name} onChange={(e) => setVForm({ ...vForm, name: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Category"><Input value={vForm.category} onChange={(e) => setVForm({ ...vForm, category: e.target.value })} /></Field>
            <Field label="Phone"><Input value={vForm.phone} onChange={(e) => setVForm({ ...vForm, phone: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={vForm.email} onChange={(e) => setVForm({ ...vForm, email: e.target.value })} /></Field>
          </div>
          <Button type="submit" disabled={insertVendor.isPending} className="w-full justify-center">Register vendor</Button>
        </form>
      </Modal>

      <Modal open={modal === "po"} onClose={() => setModal("")} title="New purchase order">
        <form className="space-y-4" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          const po_number = `PO-${String((pos ?? []).length + 1).padStart(4, "0")}`;
          insertPo.mutate({ po_number, vendor_id: pForm.vendor_id, description: pForm.description, amount: Number(pForm.amount) }, { onSuccess: () => setModal("") });
        }}>
          <Field label="Vendor">
            <Select required value={pForm.vendor_id} onChange={(e) => setPForm({ ...pForm, vendor_id: e.target.value })}>
              <option value="">Select vendor…</option>
              {(vendors ?? []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </Field>
          <Field label="Description"><Input required value={pForm.description} onChange={(e) => setPForm({ ...pForm, description: e.target.value })} /></Field>
          <Field label={`Amount (${sym})`}><Input required type="number" min="0.01" step="0.01" value={pForm.amount} onChange={(e) => setPForm({ ...pForm, amount: e.target.value })} /></Field>
          <Button type="submit" disabled={insertPo.isPending} className="w-full justify-center">Raise PO</Button>
        </form>
      </Modal>

      <Modal open={modal === "asset"} onClose={() => setModal("")} title="Register asset">
        <form className="space-y-4" onSubmit={async (e: FormEvent) => {
          e.preventDefault();
          const asset_tag = await rpc<string>("next_doc_number", { p_prefix: "AST", p_table: "assets" }).catch(() => `AST-${Date.now()}`);
          insertAsset.mutate({
            asset_tag, name: aForm.name, category: aForm.category,
            purchase_cost: Number(aForm.purchase_cost), purchase_date: aForm.purchase_date,
            useful_life_years: Number(aForm.useful_life_years), salvage_value: Number(aForm.salvage_value || 0),
          }, { onSuccess: () => setModal("") });
        }}>
          <Field label="Asset name"><Input required value={aForm.name} onChange={(e) => setAForm({ ...aForm, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select value={aForm.category} onChange={(e) => setAForm({ ...aForm, category: e.target.value })}>
                <option>Equipment</option><option>Furniture</option><option>Vehicle</option><option>Building</option><option>ICT</option>
              </Select>
            </Field>
            <Field label={`Cost (${sym})`}><Input required type="number" min="0.01" step="0.01" value={aForm.purchase_cost} onChange={(e) => setAForm({ ...aForm, purchase_cost: e.target.value })} /></Field>
            <Field label="Purchase date"><Input type="date" value={aForm.purchase_date} onChange={(e) => setAForm({ ...aForm, purchase_date: e.target.value })} /></Field>
            <Field label="Useful life (years)"><Input type="number" min="1" value={aForm.useful_life_years} onChange={(e) => setAForm({ ...aForm, useful_life_years: e.target.value })} /></Field>
            <Field label="Salvage value"><Input type="number" min="0" step="0.01" value={aForm.salvage_value} onChange={(e) => setAForm({ ...aForm, salvage_value: e.target.value })} /></Field>
          </div>
          <Button type="submit" disabled={insertAsset.isPending} className="w-full justify-center">Register asset</Button>
        </form>
      </Modal>

      <Modal open={modal === "item"} onClose={() => setModal("")} title="New inventory item">
        <form className="space-y-4" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          insertItem.mutate({ ...iForm, quantity: Number(iForm.quantity), reorder_level: Number(iForm.reorder_level) }, { onSuccess: () => setModal("") });
        }}>
          <Field label="Item name"><Input required value={iForm.name} onChange={(e) => setIForm({ ...iForm, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category"><Input value={iForm.category} onChange={(e) => setIForm({ ...iForm, category: e.target.value })} /></Field>
            <Field label="Unit"><Input value={iForm.unit} onChange={(e) => setIForm({ ...iForm, unit: e.target.value })} /></Field>
            <Field label="Quantity"><Input type="number" min="0" step="0.01" value={iForm.quantity} onChange={(e) => setIForm({ ...iForm, quantity: e.target.value })} /></Field>
            <Field label="Reorder level"><Input type="number" min="0" step="0.01" value={iForm.reorder_level} onChange={(e) => setIForm({ ...iForm, reorder_level: e.target.value })} /></Field>
          </div>
          <Button type="submit" disabled={insertItem.isPending} className="w-full justify-center">Add item</Button>
        </form>
      </Modal>
    </div>
  );
}
