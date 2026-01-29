namespace BackendApi.Dto.MovimentacaoDTO
{
    public class GraficoMensalMovimentacaoDTO
    {
        public int Mes { get; set; }
        public string NomeMes { get; set; } = string.Empty;
        public decimal TotalEntradaKg { get; set; }
        public decimal TotalSaidaKg { get; set; }
        public decimal TotalVendaKg { get; set; }
        public decimal TotalPerdaKg { get; set; }
        public decimal TotalDoacaoKg { get; set; }
        public decimal TotalVendaValor { get; set; }
    }
}
