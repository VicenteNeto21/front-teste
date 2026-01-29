namespace BackendApi.Dto.MovimentacaoDTO
{
    public class GraficoMensalMovimentacaoDTO
    {
        public int Mes { get; set; }
        public string NomeMes { get; set; } = string.Empty;
        public decimal TotalEntradaKg { get; set; }
        public decimal TotalSaidaKg { get; set; }
    }
}
